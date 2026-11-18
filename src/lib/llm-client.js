/**
 * llm-client.js
 *
 * Client interface for the context distillation pipeline.
 *
 * Calls the secure backend distillation proxy (server/index.js or Cloudflare Worker),
 * ensuring your AI model API keys are kept safe on your server and NEVER exposed in
 * client-side code or browser extensions.
 */

import { DISTILLED_FIELDS } from './capsule-schema.js'

const DEFAULT_BACKEND_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  'https://capsule-hub-proxy.capsulehub.workers.dev'

export function getBackendUrl(settings = {}) {
  const url = settings.backendUrl || DEFAULT_BACKEND_URL
  return String(url).trim().replace(/\/+$/, '')
}

/**
 * Helper to build transcript for display or debugging.
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
 * Defensive JSON extraction helper.
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

/**
 * Distill a conversation transcript into raw capsule fields via the backend proxy.
 *
 * @param {{role:string, content:string}[]} turns
 * @param {object} settings
 */
export async function distill(turns, settings = {}) {
  if (!Array.isArray(turns) || turns.length === 0) {
    throw new Error('No conversation was found to capture on this page.')
  }

  const backendUrl = getBackendUrl(settings)
  const endpoint = `${backendUrl}/api/distill`

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        turns,
        maxTurns: settings.maxTurns || 40,
      }),
      signal: AbortSignal.timeout(60000), // 60s timeout
    })
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error('Distillation request timed out after 60s. Try a shorter conversation or check your backend server.')
    }
    throw new Error(
      `Cannot connect to distillation service at ${backendUrl}. Make sure your backend server is running or configure the live URL in Settings.`,
    )
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error(`Invalid response from distillation service (${response.status}).`)
  }

  if (!response.ok || !data.ok) {
    throw new Error(data?.error || `Distillation service error (${response.status}).`)
  }

  const raw = data.capsule || {}
  const picked = {}
  for (const key of DISTILLED_FIELDS) {
    if (key in raw) picked[key] = raw[key]
  }

  return picked
}

/**
 * Health-check the backend service connection.
 */
export async function testApiKey(settings = {}) {
  const backendUrl = getBackendUrl(settings)
  const endpoint = `${backendUrl}/api/health`

  let response
  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000), // 10s timeout
    })
  } catch {
    throw new Error(`Unable to reach distillation service at ${backendUrl}. Check that the backend is running.`)
  }

  if (!response.ok) {
    throw new Error(`Distillation service returned HTTP ${response.status}.`)
  }

  const data = await response.json()
  if (data.status === 'missing_api_key') {
    throw new Error('Backend is online, but AI_API_KEY is missing from the server environment.')
  }

  return data
}
