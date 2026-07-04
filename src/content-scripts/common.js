/**
 * common.js
 *
 * The shared runtime for every platform content script. Each platform file
 * (chatgpt.js / claude.js / gemini.js) supplies a small `adapter` object that
 * knows how to read that specific site's DOM; this module provides everything
 * else in common:
 *
 *   - a floating "Capsule this conversation" button injected into the page
 *   - a lightweight toast for success/error feedback
 *   - the message listener that answers SCRAPE / INJECT / PING from the worker
 *   - remounting the button across the site's client-side navigations
 *
 * Adapter interface (see capsule-schema doc for the data shapes):
 *   adapter.platform: 'chatgpt' | 'claude' | 'gemini'
 *   adapter.scrapeConversation(): { role, content }[]
 *   adapter.getInputElement(): HTMLElement | null
 *   adapter.injectMessage(text): boolean
 */

import { MSG, ok, fail } from '../lib/messaging.js'

const BTN_ID = 'capsule-hub-fab'
const STYLE_ID = 'capsule-hub-styles'

const STYLES = `
#${BTN_ID} {
  position: fixed;
  right: 20px;
  bottom: 90px;
  z-index: 2147483646;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5, #8b5cf6);
  border: none;
  border-radius: 999px;
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.35);
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease, opacity .12s ease;
  user-select: none;
}
#${BTN_ID}:hover { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(79,70,229,.45); }
#${BTN_ID}:active { transform: translateY(0); }
#${BTN_ID}[disabled] { opacity: .7; cursor: default; }
#${BTN_ID} .ch-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #fff;
}
#${BTN_ID} .ch-spin {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,.4); border-top-color: #fff;
  animation: ch-spin .7s linear infinite;
}
@keyframes ch-spin { to { transform: rotate(360deg); } }

.capsule-hub-toast {
  position: fixed;
  right: 20px;
  bottom: 140px;
  z-index: 2147483647;
  max-width: 320px;
  padding: 12px 14px;
  font: 500 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,.25);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity .2s ease, transform .2s ease;
}
.capsule-hub-toast.show { opacity: 1; transform: translateY(0); }
.capsule-hub-toast.ok { background: #111827; border: 1px solid #10b981; }
.capsule-hub-toast.err { background: #111827; border: 1px solid #ef4444; }
.capsule-hub-toast .ch-title { font-weight: 700; margin-bottom: 2px; }
`

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = STYLES
  document.documentElement.appendChild(style)
}

function showToast(kind, title, body) {
  const toast = document.createElement('div')
  toast.className = `capsule-hub-toast ${kind}`
  toast.innerHTML = `<div class="ch-title"></div><div class="ch-body"></div>`
  toast.querySelector('.ch-title').textContent = title
  toast.querySelector('.ch-body').textContent = body || ''
  document.body.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('show'))
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 250)
  }, 4200)
}

function setButtonState(btn, state) {
  if (!btn) return
  if (state === 'loading') {
    btn.setAttribute('disabled', 'true')
    btn.innerHTML = `<span class="ch-spin"></span><span>Distilling…</span>`
  } else {
    btn.removeAttribute('disabled')
    btn.innerHTML = `<span class="ch-dot"></span><span>Capsule this chat</span>`
  }
}

/**
 * Handle an in-page capture: scrape locally, then hand the turns to the
 * background worker which owns the API key + distillation.
 */
async function handleCaptureClick(adapter, btn) {
  setButtonState(btn, 'loading')
  try {
    const turns = safeScrape(adapter)
    if (!turns.length) {
      showToast('err', 'Nothing to capture', 'No conversation messages were found on this page.')
      return
    }
    const rawExcerpt = buildExcerpt(turns)
    const res = await chrome.runtime.sendMessage({
      type: MSG.DISTILL_AND_SAVE,
      platform: adapter.platform,
      turns,
      rawExcerpt,
    })
    if (res && res.ok) {
      showToast('ok', 'Capsule saved ✓', `“${res.capsule.title}” is ready in Capsule Hub.`)
    } else {
      showToast('err', 'Capture failed', res?.error || 'Unknown error.')
    }
  } catch (e) {
    showToast('err', 'Capture failed', e?.message || String(e))
  } finally {
    setButtonState(btn, 'idle')
  }
}

function safeScrape(adapter) {
  try {
    const turns = adapter.scrapeConversation() || []
    // Basic sanity filter: drop empty turns.
    return turns
      .map((t) => ({ role: t.role === 'assistant' ? 'assistant' : 'user', content: (t.content || '').trim() }))
      .filter((t) => t.content)
  } catch (e) {
    console.warn('[Capsule Hub] scrape failed:', e)
    return []
  }
}

function buildExcerpt(turns, max = 500) {
  const text = turns.map((t) => `${t.role}: ${t.content}`).join('\n')
  return text.length > max ? text.slice(0, max) + '…' : text
}

function mountButton(adapter) {
  ensureStyles()
  if (document.getElementById(BTN_ID)) return
  const btn = document.createElement('button')
  btn.id = BTN_ID
  btn.type = 'button'
  btn.title = 'Capture this conversation as a reusable Capsule'
  setButtonState(btn, 'idle')
  btn.addEventListener('click', () => handleCaptureClick(adapter, btn))
  document.body.appendChild(btn)
}

/**
 * Wire up an adapter: mount the button, keep it mounted across SPA navigation,
 * and answer messages from the background worker.
 */
export function initContentScript(adapter) {
  // Guard against double-injection (SPA remounts, extension reloads).
  if (window.__capsuleHubInit) return
  window.__capsuleHubInit = true

  const remount = () => {
    if (!document.getElementById(BTN_ID)) mountButton(adapter)
  }

  // Initial mount (body may not be ready at document_idle on slow loads).
  if (document.body) mountButton(adapter)
  else document.addEventListener('DOMContentLoaded', () => mountButton(adapter))

  // Re-mount if the app tears down our node during route changes.
  const observer = new MutationObserver(() => remount())
  observer.observe(document.documentElement, { childList: true, subtree: true })

  // Answer the background worker.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return false

    if (msg.type === MSG.PING) {
      sendResponse(ok({ platform: adapter.platform }))
      return true
    }

    if (msg.type === MSG.SCRAPE) {
      try {
        const turns = safeScrape(adapter)
        sendResponse(ok({ turns, rawExcerpt: buildExcerpt(turns), platform: adapter.platform }))
      } catch (e) {
        sendResponse(fail(e))
      }
      return true
    }

    if (msg.type === MSG.INJECT) {
      try {
        const done = adapter.injectMessage(msg.text)
        if (done) {
          showToast('ok', 'Capsule loaded ✓', 'Review the context, then send when ready.')
          sendResponse(ok())
        } else {
          sendResponse(fail(new Error('Could not find the message input on this page.')))
        }
      } catch (e) {
        sendResponse(fail(e))
      }
      return true
    }

    return false
  })
}
