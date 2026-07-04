/**
 * gemini.js — content script adapter for Gemini (gemini.google.com)
 *
 * ⚠️ Best-effort selectors. Gemini uses Angular custom elements:
 * `<user-query>` for the human turn and `<model-response>` (with a
 * `.markdown` body) for the reply. The composer is a `.ql-editor`
 * (Quill) contenteditable in a `<rich-textarea>`.
 *
 * Gemini support is marked "stretch / experimental" in the README because its
 * markup churns the most of the three.
 */

import { initContentScript } from './common.js'
import { queryFirst, pickElement, extractTurnText, insertIntoEditor } from './dom-utils.js'

const adapter = {
  platform: 'gemini',

  scrapeConversation() {
    const userNodes = document.querySelectorAll('user-query, [class*="user-query"]')
    const modelNodes = document.querySelectorAll('model-response, message-content .markdown')

    if (userNodes.length || modelNodes.length) {
      const tagged = [
        ...Array.from(userNodes).map((el) => ({ el, role: 'user' })),
        ...Array.from(modelNodes).map((el) => ({ el, role: 'assistant' })),
      ]
      tagged.sort((a, b) =>
        a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      )
      return tagged.map(({ el, role }) => ({ role, content: extractTurnText(el) }))
    }

    // Fallback: conversation container children, alternate roles.
    const turns = queryFirst(document, [
      'div.conversation-container',
      'main [class*="conversation"] [class*="message"]',
    ])
    return turns.map((el, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: extractTurnText(el),
    }))
  },

  getInputElement() {
    return pickElement(document, [
      'rich-textarea .ql-editor[contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      'rich-textarea div[contenteditable="true"]',
      'textarea',
    ])
  },

  injectMessage(text) {
    return insertIntoEditor(this.getInputElement(), text)
  },
}

initContentScript(adapter)
