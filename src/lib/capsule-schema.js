/**
 * capsule-schema.js
 *
 * The canonical shape of a "Capsule" — the structured distillation of an AI
 * conversation. This is the technical heart of the project: instead of dumping
 * raw transcript text, we normalise a conversation into typed fields that can be
 * searched, edited, and re-formatted per target platform.
 *
 * This module is intentionally framework-free (no React, no chrome APIs) so it
 * can be imported from the popup, the background worker, and content scripts
 * alike.
 */

/** @typedef {'chatgpt' | 'claude' | 'gemini' | 'unknown'} SourcePlatform */

/**
 * @typedef {Object} CodeSnippet
 * @property {string} language  Best-effort language tag (e.g. "python").
 * @property {string} code      The snippet body.
 * @property {string} context   One line on what the snippet is for.
 */

/**
 * @typedef {Object} Capsule
 * @property {string} id
 * @property {string} title
 * @property {SourcePlatform} source_platform
 * @property {string} created_at         ISO timestamp
 * @property {string[]} tags
 * @property {string} goal
 * @property {string[]} constraints
 * @property {string[]} key_decisions
 * @property {CodeSnippet[]} code_snippets
 * @property {string[]} open_questions
 * @property {string} raw_excerpt
 * @property {number} [turn_count]       How many conversation turns were captured.
 */

export const SUPPORTED_PLATFORMS = ['chatgpt', 'claude', 'gemini']

export const PLATFORM_LABELS = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  unknown: 'Unknown',
}

/**
 * The subset of fields we ask the LLM to produce. `id`, `created_at`,
 * `source_platform`, and `raw_excerpt` are filled in by the client, not the LLM.
 */
export const DISTILLED_FIELDS = [
  'suggested_title',
  'suggested_tags',
  'goal',
  'constraints',
  'key_decisions',
  'code_snippets',
  'open_questions',
]

/** Generate a RFC4122 v4 UUID using the Web Crypto API (available in SW + popup). */
export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  // Fallback for exotic environments.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function asString(value, fallback = '') {
  if (typeof value === 'string') return value.trim()
  if (value == null) return fallback
  return String(value).trim()
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    // Tolerate a single string where an array was expected.
    if (typeof value === 'string' && value.trim()) return [value.trim()]
    return []
  }
  return value
    .map((v) => asString(v))
    .filter(Boolean)
    // Guard against a runaway model emitting hundreds of items.
    .slice(0, 40)
}

function asCodeSnippets(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((snip) => {
      if (typeof snip === 'string') {
        return { language: 'text', code: snip.trim(), context: '' }
      }
      if (snip && typeof snip === 'object') {
        return {
          language: asString(snip.language, 'text') || 'text',
          code: asString(snip.code),
          context: asString(snip.context),
        }
      }
      return null
    })
    .filter((s) => s && s.code)
    .slice(0, 20)
}

/**
 * Coerce an arbitrary object (typically parsed from LLM output, or loaded from
 * storage that may predate a schema change) into a valid, fully-populated
 * Capsule. This is the single choke point that guarantees every capsule the rest
 * of the app touches is well-formed — defensive by design.
 *
 * @param {Partial<Capsule> & Record<string, any>} input
 * @param {{ source_platform?: SourcePlatform, raw_excerpt?: string, turn_count?: number }} [meta]
 * @returns {Capsule}
 */
export function normalizeCapsule(input = {}, meta = {}) {
  const title =
    asString(input.title) ||
    asString(input.suggested_title) ||
    asString(input.goal).slice(0, 60) ||
    'Untitled Capsule'

  const tags = asStringArray(input.tags ?? input.suggested_tags)
    .map((t) => t.toLowerCase().replace(/\s+/g, '-'))
    // de-dupe while preserving order
    .filter((t, i, arr) => arr.indexOf(t) === i)

  return {
    id: asString(input.id) || newId(),
    title: title.slice(0, 120),
    source_platform: meta.source_platform || input.source_platform || 'unknown',
    created_at: asString(input.created_at) || new Date().toISOString(),
    tags,
    goal: asString(input.goal),
    constraints: asStringArray(input.constraints),
    key_decisions: asStringArray(input.key_decisions),
    code_snippets: asCodeSnippets(input.code_snippets),
    open_questions: asStringArray(input.open_questions),
    raw_excerpt: asString(meta.raw_excerpt ?? input.raw_excerpt),
    turn_count: Number.isFinite(meta.turn_count)
      ? meta.turn_count
      : Number.isFinite(input.turn_count)
        ? input.turn_count
        : 0,
  }
}

/** A blank capsule, useful for the manual "new capsule" / edit flows. */
export function createEmptyCapsule(overrides = {}) {
  return normalizeCapsule(overrides)
}

/** Quick health check: does a capsule carry any distilled signal at all? */
export function isCapsuleMeaningful(capsule) {
  return Boolean(
    capsule &&
      (capsule.goal ||
        capsule.constraints.length ||
        capsule.key_decisions.length ||
        capsule.code_snippets.length ||
        capsule.open_questions.length),
  )
}
