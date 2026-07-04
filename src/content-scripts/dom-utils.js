/**
 * dom-utils.js
 *
 * Shared, platform-agnostic DOM helpers for the content scripts: scraping text
 * out of chat turns and inserting text into the various editor widgets these
 * apps use (contenteditable ProseMirror, plain <textarea>, etc.).
 *
 * ⚠️ FRAGILITY NOTE: The three target sites are unversioned SPAs whose DOM and
 * CSS class names change frequently and without notice. Every selector here is
 * a best-effort guess with layered fallbacks. When a platform ships a redesign,
 * the adapters (chatgpt.js / claude.js / gemini.js) are the files to update.
 * This is documented as a known limitation in the README.
 */

/** Try a list of selectors in order; return the first non-empty NodeList. */
export function queryFirst(root, selectors) {
  for (const sel of selectors) {
    const nodes = root.querySelectorAll(sel)
    if (nodes.length) return Array.from(nodes)
  }
  return []
}

/** Return the first matching element from a list of selectors, or null. */
export function pickElement(root, selectors) {
  for (const sel of selectors) {
    const el = root.querySelector(sel)
    if (el) return el
  }
  return null
}

/**
 * Extract readable text from a chat-turn element while preserving code blocks as
 * fenced Markdown (so the distiller can see snippets clearly). Walks the node
 * tree rather than using innerText so we can special-case <pre>/<code>.
 */
export function extractTurnText(el) {
  if (!el) return ''
  const parts = []

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const tag = node.tagName.toLowerCase()

    // Skip obvious UI chrome that isn't conversation content.
    if (['button', 'svg', 'style', 'script'].includes(tag)) return
    if (node.getAttribute('aria-hidden') === 'true') return

    if (tag === 'pre') {
      const codeEl = node.querySelector('code') || node
      const lang = detectLang(codeEl)
      parts.push(`\n\`\`\`${lang}\n${codeEl.textContent.trim()}\n\`\`\`\n`)
      return
    }
    if (tag === 'br') {
      parts.push('\n')
      return
    }

    for (const child of node.childNodes) walk(child)

    // Add a newline after block-level elements to keep structure.
    if (['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'tr'].includes(tag)) {
      parts.push('\n')
    }
  }

  walk(el)
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim()
}

function detectLang(codeEl) {
  const cls = codeEl.className || ''
  const m = cls.match(/language-([\w+-]+)/)
  if (m) return m[1]
  return ''
}

/**
 * Insert `text` into a target editor element in a way that survives React /
 * ProseMirror controlled inputs.
 *
 * Strategy, in order of preference:
 *   1. <textarea>/<input>: use the native value setter + fire an `input` event
 *      so React's onChange sees the change.
 *   2. contenteditable: focus, select-all, and use `insertText` via the
 *      beforeinput/execCommand path, which ProseMirror-based editors honour.
 *
 * We never auto-submit — the user always reviews before sending.
 */
export function insertIntoEditor(el, text) {
  if (!el) return false
  el.focus()

  const tag = el.tagName ? el.tagName.toLowerCase() : ''
  if (tag === 'textarea' || tag === 'input') {
    return setNativeValue(el, text)
  }

  if (el.isContentEditable) {
    return insertIntoContentEditable(el, text)
  }

  // Some composers wrap the real field; look for a nested editable target.
  const nested =
    el.querySelector('textarea, input, [contenteditable="true"]') || null
  if (nested) return insertIntoEditor(nested, text)

  return false
}

function setNativeValue(el, value) {
  const proto = el.tagName.toLowerCase() === 'textarea'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}

function insertIntoContentEditable(el, text) {
  // Move caret to end / select existing content so we replace, not append blindly.
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(el)
  selection.removeAllRanges()
  selection.addRange(range)

  // Preferred path: execCommand('insertText') fires the input events ProseMirror
  // listens for. Deprecated but still the most reliable cross-editor method.
  let inserted = false
  try {
    inserted = document.execCommand('insertText', false, text)
  } catch {
    inserted = false
  }

  if (!inserted) {
    // Fallback: dispatch a beforeinput/insertText, then set textContent.
    el.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text,
      }),
    )
    el.textContent = text
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
  }
  return true
}
