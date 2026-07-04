/**
 * claude.js — content script adapter for Claude (claude.ai)
 *
 * ⚠️ Best-effort selectors. Claude tags human vs assistant turns with
 * `data-testid="user-message"` and renders assistant replies inside
 * `.font-claude-message` (or similar). The composer is a ProseMirror
 * contenteditable — insertIntoEditor() handles that case.
 */

import { initContentScript } from './common.js'
import { queryFirst, pickElement, extractTurnText, insertIntoEditor } from './dom-utils.js'

const adapter = {
  platform: 'claude',

  scrapeConversation() {
    // Primary: distinct testids / classes for the two roles.
    const userNodes = document.querySelectorAll('[data-testid="user-message"]')
    const assistantNodes = document.querySelectorAll(
      '.font-claude-message, [data-testid="assistant-message"], [data-is-streaming] .font-claude-message',
    )

    if (userNodes.length || assistantNodes.length) {
      // Merge both sets and re-order by DOM position so the transcript reads
      // top-to-bottom regardless of which selector matched.
      const tagged = [
        ...Array.from(userNodes).map((el) => ({ el, role: 'user' })),
        ...Array.from(assistantNodes).map((el) => ({ el, role: 'assistant' })),
      ]
      tagged.sort((a, b) =>
        a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      )
      return tagged.map(({ el, role }) => ({ role, content: extractTurnText(el) }))
    }

    // Fallback: generic message groups, alternate roles.
    const turns = queryFirst(document, [
      'div[data-test-render-count] div.group',
      'main div.group',
    ])
    return turns.map((el, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: extractTurnText(el),
    }))
  },

  getInputElement() {
    return pickElement(document, [
      'div[contenteditable="true"].ProseMirror',
      'div.ProseMirror[contenteditable="true"]',
      'fieldset div[contenteditable="true"]',
      'div[contenteditable="true"]',
    ])
  },

  injectMessage(text) {
    return insertIntoEditor(this.getInputElement(), text)
  },
}

initContentScript(adapter)
