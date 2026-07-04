/**
 * llm-client.js
 *
 * Provider-agnostic wrapper around the "context distillation" LLM call. The rest
 * of the app only ever calls `distill()` / `testApiKey()` and never knows which
 * vendor answered — swapping providers is a settings toggle.
 *
 * Supported providers:
 *   - openai      → api.openai.com (native)
 *   - openrouter  → openrouter.ai (OpenAI-compatible; one key, 100+ models)
 *   - anthropic   → api.anthropic.com (native Messages API)
 *
 * OpenAI and OpenRouter share the same request shape, so they go through one
 * `callOpenAICompatible()` path parameterised by a small provider registry.
 *
 * Runs inside the background service worker, which is the only context with the
 * host permissions needed to reach these endpoints.
 */

import { DISTILLED_FIELDS } from './capsule-schema.js'

const SYSTEM_PROMPT = `You are a context-distillation engine for developers who move a project between different AI assistants.

Given a raw AI conversation transcript, extract ONLY the reusable context as STRICT JSON matching exactly this schema:

{
  "suggested_title": "short (3-8 word) title naming the project/task",
  "suggested_tags": ["3-6 lowercase kebab-case topic tags"],
  "goal": "1-2 sentence summary of what the user is ultimately trying to achieve",
  "constraints": ["explicit requirements, preferences, tech choices, or restrictions the user stated"],
  "key_decisions": ["concrete decisions made or conclusions reached during the conversation"],
  "code_snippets": [{"language": "python", "code": "the snippet", "context": "one line on what it is for"}],
  "open_questions": ["unresolved questions, blockers, or explicit next steps"]
}

Rules:
- Output ONLY the JSON object. No prose, no markdown code fences, no commentary.
- Be concise and factual. Do not invent information not present in the transcript.
- Prefer the USER's stated intent over the assistant's suggestions when they differ.
- Omit empty fields as empty arrays / empty strings — never use null.
- Keep code_snippets to the few that carry real reuse value; drop trivial ones.
- Escape all strings so the result is valid JSON.`

/**
 * Provider registry. `openai` and `openrouter` are OpenAI-compatible; `anthropic`
 * has its own caller. `jsonMode` toggles the `response_format: json_object`
 * request field — OpenAI supports it universally, but many OpenRouter models
 * (especially free ones) don't, so we rely on the prompt + defensive parsing
 * there instead.
 */
const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    kind: 'openai-compatible',
    keyField: 'openaiApiKey',
    modelField: 'openaiModel',
    url: 'https://api.openai.com/v1/chat/completions',
    jsonMode: true,
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  openrouter: {
    label: 'OpenRouter',
    kind: 'openai-compatible',
    keyField: 'openrouterApiKey',
    modelField: 'openrouterModel',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    jsonMode: false,
    headers: (key) => ({
      Authorization: `Bearer ${key}`,
      // OpenRouter uses these for attribution/rankings (optional but recommended).
      'HTTP-Referer': 'https://github.com/your-username/capsule-hub',
      'X-Title': 'Capsule Hub',
    }),
  },
  anthropic: {
    label: 'Anthropic',
    kind: 'anthropic',
    keyField: 'anthropicApiKey',
    modelField: 'anthropicModel',
    url: 'https://api.anthropic.com/v1/messages',
  },
}

function resolveProvider(settings) {
  const key = PROVIDERS[settings.provider] ? settings.provider : 'openai'
  return { id: key, config: PROVIDERS[key] }
}

function readKey(settings, config) {
  // Trim defensively — pasted keys frequently carry a trailing space/newline,
  // which produces a malformed auth header and a confusing 401.
  return String(settings[config.keyField] || '').trim()
}

/**
 * Turn scraped turns into a compact transcript, honouring a turn cap for cost
 * control. Keeps the MOST RECENT turns (the tail usually holds current state).
 */
export function buildTranscript(turns, maxTurns = 40) {
  const trimmed = turns.slice(-maxTurns)
  return trimmed
    .map((t) => {
      const role = t.role === 'assistant' ? 'ASSISTANT' : 'USER'
      return `${role}:\n${(t.content || '').trim()}`
    })
    .join('\n\n---\n\n')
}

/**
 * Extract a JSON object from a model response that *should* be pure JSON but
 * sometimes arrives wrapped in ```json fences or with leading prose.
 */
export function parseModelJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('The model returned an empty response.')
  }
  let candidate = text.trim()

  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) candidate = fence[1].trim()

  try {
    return JSON.parse(candidate)
  } catch {
    /* fall through */
  }

  const first = candidate.indexOf('{')
  const last = candidate.lastIndexOf('}')
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(candidate.slice(first, last + 1))
    } catch {
      /* fall through */
    }
  }

  throw new Error('Could not parse a valid JSON capsule from the model response.')
}

// --- Provider callers --------------------------------------------------------

async function callOpenAICompatible({ config, apiKey, model, transcript }) {
  const body = {
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Distill the following transcript into the capsule JSON:\n\n${transcript}` },
    ],
  }
  if (config.jsonMode) body.response_format = { type: 'json_object' }

  const res = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...config.headers(apiKey) },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw await providerError(config.label, res)
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  return parseModelJson(content)
}

async function callAnthropic({ config, apiKey, model, transcript }) {
  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Required to call the Anthropic API from a browser/extension context.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Distill the following transcript into the capsule JSON. Respond with ONLY the JSON object:\n\n${transcript}`,
        },
      ],
    }),
  })

  if (!res.ok) throw await providerError(config.label, res)
  const data = await res.json()
  return parseModelJson(data?.content?.[0]?.text)
}

/** Build a helpful Error from a failed provider response. */
async function providerError(label, res) {
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.error?.message || body?.message || ''
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 401) {
    return new Error(
      `${label} rejected your API key (401). Make sure it's a ${label} key (re-paste with no extra spaces) and that it's active on ${label}'s dashboard.`,
    )
  }
  if (res.status === 402) {
    return new Error(`${label} says this request needs credits/billing (402). Add funds and retry.`)
  }
  if (res.status === 404) {
    return new Error(`${label} couldn't find that model (404). Check the model name in Settings.`)
  }
  if (res.status === 429) {
    return new Error(`${label} rate limit or quota reached (429). Try again shortly.`)
  }
  return new Error(`${label} API error (${res.status})${detail ? `: ${detail}` : ''}.`)
}

// --- Public API --------------------------------------------------------------

/**
 * Distill a transcript into raw capsule fields (see DISTILLED_FIELDS).
 * @param {{role:string, content:string}[]} turns
 * @param {object} settings
 */
export async function distill(turns, settings) {
  if (!Array.isArray(turns) || turns.length === 0) {
    throw new Error('No conversation was found to capture on this page.')
  }

  const { config } = resolveProvider(settings)
  const apiKey = readKey(settings, config)
  if (!apiKey) throw new Error(`No ${config.label} API key set. Add one in Settings.`)

  const model = settings[config.modelField]
  const transcript = buildTranscript(turns, settings.maxTurns)

  const raw =
    config.kind === 'anthropic'
      ? await callAnthropic({ config, apiKey, model, transcript })
      : await callOpenAICompatible({ config, apiKey, model, transcript })

  // Keep only recognised distilled fields; the schema normaliser does the rest.
  const picked = {}
  for (const key of DISTILLED_FIELDS) if (key in raw) picked[key] = raw[key]
  return picked
}

/**
 * Lightweight credential check for the Settings "Test key" button. Sends a
 * 1-token request so the user gets instant feedback without a full distill.
 */
export async function testApiKey(settings) {
  const { config } = resolveProvider(settings)
  const apiKey = readKey(settings, config)
  if (!apiKey) throw new Error('Enter an API key first.')
  const model = settings[config.modelField]

  if (config.kind === 'anthropic') {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    })
    if (!res.ok) throw await providerError(config.label, res)
    return true
  }

  const res = await fetch(config.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...config.headers(apiKey) },
    body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
  })
  if (!res.ok) throw await providerError(config.label, res)
  return true
}
