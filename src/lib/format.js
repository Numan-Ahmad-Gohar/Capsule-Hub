/**
 * format.js
 *
 * Turns a structured Capsule back into a text preamble suitable for pasting as
 * the first message of a NEW conversation on a target platform.
 *
 * This is where "platform-specific tuning" lives. Today all three platforms get
 * the same clean Markdown block (ChatGPT, Claude, and Gemini all render Markdown
 * in their composer), but the per-platform switch is wired up so you can diverge
 * later — e.g. a terser variant for Gemini, or an XML-tagged variant for Claude —
 * without touching the popup.
 */

import { PLATFORM_LABELS } from './capsule-schema.js'

function bulletList(items) {
  return items.map((i) => `- ${i}`).join('\n')
}

function codeBlocks(snippets) {
  return snippets
    .map((s) => {
      const header = s.context ? `${s.context}\n` : ''
      return `${header}\`\`\`${s.language || ''}\n${s.code}\n\`\`\``
    })
    .join('\n\n')
}

/**
 * Shared Markdown rendering. Sections with no content are omitted so the
 * preamble stays tight.
 */
function toMarkdown(capsule) {
  const parts = []
  parts.push(
    `**Context Capsule — "${capsule.title}"** _(carried over from ${PLATFORM_LABELS[capsule.source_platform] || 'another assistant'})_`,
  )
  parts.push(
    `I'm continuing a project here. Please read this context, confirm you understand it, and then help me proceed. Do not restate it back to me in full.`,
  )

  if (capsule.goal) parts.push(`### Goal\n${capsule.goal}`)
  if (capsule.constraints.length) parts.push(`### Constraints & Preferences\n${bulletList(capsule.constraints)}`)
  if (capsule.key_decisions.length) parts.push(`### Decisions So Far\n${bulletList(capsule.key_decisions)}`)
  if (capsule.open_questions.length) parts.push(`### Open Questions / Next Steps\n${bulletList(capsule.open_questions)}`)
  if (capsule.code_snippets.length) parts.push(`### Relevant Code\n${codeBlocks(capsule.code_snippets)}`)

  if (capsule.tags.length) parts.push(`_Tags: ${capsule.tags.join(', ')}_`)

  return parts.join('\n\n')
}

/**
 * @param {import('./capsule-schema.js').Capsule} capsule
 * @param {'chatgpt'|'claude'|'gemini'|'unknown'} platform  target platform
 * @returns {string}
 */
export function formatCapsuleForPlatform(capsule, platform) {
  switch (platform) {
    case 'claude':
    case 'chatgpt':
    case 'gemini':
    default:
      // Single shared renderer for now — see module docstring for why the switch
      // exists anyway (future per-platform divergence point).
      return toMarkdown(capsule)
  }
}

/** A compact one-line summary for list rows and previews. */
export function capsuleSubtitle(capsule) {
  if (capsule.goal) return capsule.goal
  if (capsule.key_decisions.length) return capsule.key_decisions[0]
  if (capsule.constraints.length) return capsule.constraints[0]
  return 'No summary available.'
}
