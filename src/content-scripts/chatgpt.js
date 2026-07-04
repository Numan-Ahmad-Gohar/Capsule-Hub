/**
 * chatgpt.js — content script adapter for ChatGPT (chatgpt.com / chat.openai.com)
 *
 * ⚠️ Selectors are best-effort against a frequently-changing SPA. ChatGPT marks
 * conversation turns with `data-message-author-role` on message wrappers, which
 * has been one of its more stable hooks; we layer additional fallbacks around it.
 */

import { initContentScript } from './common.js'
import { queryFirst, pickElement, extractTurnText, insertIntoEditor } from './dom-utils.js'

const adapter = {
  platform: 'chatgpt',

  scrapeConversation() {
    // Primary: explicit author-role markers.
    let nodes = document.querySelectorAll('[data-message-author-role]')
    if (nodes.length) {
      return Array.from(nodes).map((el) => ({
        role: el.getAttribute('data-message-author-role') === 'user' ? 'user' : 'assistant',
        content: extractTurnText(el),
      }))
    }

    // Fallback: generic turn containers, alternate roles by testid where present.
    const turns = queryFirst(document, [
      'article[data-testid^="conversation-turn"]',
      'div[data-testid^="conversation-turn"]',
      'main [class*="group"] [class*="markdown"]',
    ])
    return turns.map((el, i) => {
      const roleAttr = el.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role')
      const role = roleAttr ? (roleAttr === 'user' ? 'user' : 'assistant') : i % 2 === 0 ? 'user' : 'assistant'
      return { role, content: extractTurnText(el) }
    })
  },

  getInputElement() {
    return pickElement(document, [
      '#prompt-textarea',
      'div[contenteditable="true"]#prompt-textarea',
      'form textarea',
      'main div[contenteditable="true"]',
    ])
  },

  injectMessage(text) {
    return insertIntoEditor(this.getInputElement(), text)
  },
}

initContentScript(adapter)
