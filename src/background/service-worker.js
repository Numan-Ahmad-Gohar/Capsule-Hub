/**
 * service-worker.js
 *
 * The extension's central nervous system. It is the ONLY context that:
 *   - holds the LLM/API logic (has the host permissions to reach the endpoints)
 *   - owns the capture → distill → save pipeline
 *   - routes messages between the popup and the per-page content scripts
 *
 * Keeping this logic here (rather than in the popup) means a capture survives the
 * popup being closed, and content scripts never need API keys.
 */

import { MSG, CAPTURE_STAGE, ok, fail, sendToTab } from '../lib/messaging.js'
import { getSettings, saveCapsule } from '../lib/storage.js'
import { distill, testApiKey } from '../lib/llm-client.js'
import { normalizeCapsule, isCapsuleMeaningful } from '../lib/capsule-schema.js'

// --- helpers ----------------------------------------------------------------

const PLATFORM_BY_HOST = [
  { test: /(^|\.)chatgpt\.com$/, platform: 'chatgpt' },
  { test: /(^|\.)chat\.openai\.com$/, platform: 'chatgpt' },
  { test: /(^|\.)claude\.ai$/, platform: 'claude' },
  { test: /(^|\.)gemini\.google\.com$/, platform: 'gemini' },
]

function platformForUrl(url) {
  try {
    const host = new URL(url).hostname
    for (const { test, platform } of PLATFORM_BY_HOST) if (test.test(host)) return platform
  } catch {
    /* invalid url */
  }
  return 'unknown'
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab || null
}

/** Broadcast capture progress so the popup can render a live status. */
function broadcastStatus(stage, extra = {}) {
  chrome.runtime
    .sendMessage({ type: MSG.CAPTURE_STATUS, stage, ...extra })
    .catch(() => {
      /* no popup open — fine */
    })
}

/**
 * The core pipeline, shared by both entry points (in-page button + popup
 * button). Takes already-scraped turns, distills, normalises, and saves.
 */
async function distillAndSave({ platform, turns, rawExcerpt }) {
  const settings = await getSettings()

  broadcastStatus(CAPTURE_STAGE.DISTILLING)
  const distilled = await distill(turns, settings)

  broadcastStatus(CAPTURE_STAGE.SAVING)
  const capsule = normalizeCapsule(distilled, {
    source_platform: platform,
    raw_excerpt: rawExcerpt || '',
    turn_count: turns.length,
  })

  if (!isCapsuleMeaningful(capsule)) {
    throw new Error('The conversation had too little content to distill into a capsule.')
  }

  const saved = await saveCapsule(capsule)
  broadcastStatus(CAPTURE_STAGE.DONE, { capsule: saved })
  // Notify any open popup that the list changed (storage.onChanged also fires).
  chrome.runtime.sendMessage({ type: MSG.CAPSULE_SAVED, capsule: saved }).catch(() => {})
  return saved
}

/**
 * Ask the active tab's content script to scrape, then run the pipeline. Used by
 * the popup's "Capture current conversation" button.
 */
async function captureActiveTab() {
  const tab = await getActiveTab()
  if (!tab || !tab.id) throw new Error('No active tab found.')

  const platform = platformForUrl(tab.url || '')
  if (platform === 'unknown') {
    throw new Error('Open a ChatGPT, Claude, or Gemini conversation, then capture.')
  }

  broadcastStatus(CAPTURE_STAGE.SCRAPING)
  let scrape
  try {
    scrape = await sendToTab(tab.id, { type: MSG.SCRAPE })
  } catch {
    // Content script not present (page loaded before install, or SPA nav).
    throw new Error('Could not reach the page. Reload the tab and try again.')
  }
  if (!scrape || !scrape.ok) {
    throw new Error(scrape?.error || 'Failed to read the conversation from the page.')
  }
  return distillAndSave({
    platform,
    turns: scrape.turns || [],
    rawExcerpt: scrape.rawExcerpt || '',
  })
}

/** Send formatted capsule text into the active tab's input box. */
async function injectCapsule({ text }) {
  const tab = await getActiveTab()
  if (!tab || !tab.id) throw new Error('No active tab found.')
  const platform = platformForUrl(tab.url || '')
  if (platform === 'unknown') {
    throw new Error('Open ChatGPT, Claude, or Gemini first, then load a capsule.')
  }
  let res
  try {
    res = await sendToTab(tab.id, { type: MSG.INJECT, text })
  } catch {
    throw new Error('Could not reach the page. Reload the tab and try again.')
  }
  if (!res || !res.ok) throw new Error(res?.error || 'Injection failed.')
  return { platform }
}

/** Report which supported platform (if any) the active tab is on. */
async function getActiveContext() {
  const tab = await getActiveTab()
  const platform = tab ? platformForUrl(tab.url || '') : 'unknown'
  return { platform, tabId: tab?.id ?? null, url: tab?.url ?? '' }
}

// --- message router ----------------------------------------------------------
//
// chrome.runtime.onMessage handlers must return `true` to keep the response
// channel open for an async reply. We centralise that here: each case returns a
// Promise, and we uniformly resolve it into an {ok} / {ok:false,error} envelope.

const ROUTES = {
  [MSG.CAPTURE_ACTIVE_TAB]: () => captureActiveTab().then((capsule) => ({ capsule })),
  [MSG.DISTILL_AND_SAVE]: (msg) =>
    distillAndSave({
      platform: msg.platform,
      turns: msg.turns,
      rawExcerpt: msg.rawExcerpt,
    }).then((capsule) => ({ capsule })),
  [MSG.INJECT_CAPSULE]: (msg) => injectCapsule({ text: msg.text }),
  [MSG.GET_ACTIVE_CONTEXT]: () => getActiveContext(),
  [MSG.TEST_API_KEY]: async () => {
    await testApiKey(await getSettings())
    return {}
  },
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const route = message && ROUTES[message.type]
  if (!route) return false // not ours — let other listeners handle it

  Promise.resolve()
    .then(() => route(message))
    .then((data) => sendResponse(ok(data)))
    .catch((err) => {
      broadcastStatus(CAPTURE_STAGE.ERROR, { error: err.message })
      sendResponse(fail(err))
    })

  return true // async response
})

// First-run: open a friendly state. (Onboarding UI lives in the popup.)
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Nothing heavy here — the popup drives onboarding based on settings.onboarded.
    console.info('[Capsule Hub] Installed. Click the toolbar icon to get started.')
  }
})
