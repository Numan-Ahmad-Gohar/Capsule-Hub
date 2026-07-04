/**
 * messaging.js
 *
 * Central definition of the message protocol used across the three extension
 * contexts (popup ⇄ background ⇄ content script). Keeping every message `type`
 * in one enum avoids the classic extension bug where a typo'd string silently
 * drops a message.
 *
 * Flow summary:
 *   content → background : DISTILL_AND_SAVE   (user clicked in-page button)
 *   popup   → background : CAPTURE_ACTIVE_TAB (user clicked capture in popup)
 *   popup   → background : INJECT_CAPSULE     (user chose a capsule to re-use)
 *   background → content : SCRAPE / INJECT
 *   background → popup    : CAPSULE_SAVED / CAPTURE_STATUS (broadcast)
 */

export const MSG = Object.freeze({
  // popup → background
  CAPTURE_ACTIVE_TAB: 'CAPTURE_ACTIVE_TAB',
  INJECT_CAPSULE: 'INJECT_CAPSULE',
  GET_ACTIVE_CONTEXT: 'GET_ACTIVE_CONTEXT',
  TEST_API_KEY: 'TEST_API_KEY',

  // content → background
  DISTILL_AND_SAVE: 'DISTILL_AND_SAVE',

  // background → content
  SCRAPE: 'SCRAPE',
  INJECT: 'INJECT',
  PING: 'PING',

  // background → popup / everywhere (broadcast)
  CAPSULE_SAVED: 'CAPSULE_SAVED',
  CAPTURE_STATUS: 'CAPTURE_STATUS',
})

/** Stages surfaced to the UI during the (multi-second) capture pipeline. */
export const CAPTURE_STAGE = Object.freeze({
  SCRAPING: 'scraping',
  DISTILLING: 'distilling',
  SAVING: 'saving',
  DONE: 'done',
  ERROR: 'error',
})

/**
 * Promise wrapper around chrome.runtime.sendMessage. Rejects on the lastError
 * that Chrome otherwise stashes on a global you have to remember to read.
 */
export function sendToBackground(message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        const err = chrome.runtime.lastError
        if (err) return reject(new Error(err.message))
        resolve(response)
      })
    } catch (e) {
      reject(e)
    }
  })
}

/** Promise wrapper around chrome.tabs.sendMessage (background/popup → content). */
export function sendToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        const err = chrome.runtime.lastError
        if (err) return reject(new Error(err.message))
        resolve(response)
      })
    } catch (e) {
      reject(e)
    }
  })
}

/** Standard success/failure envelope so handlers don't reinvent the shape. */
export const ok = (data = {}) => ({ ok: true, ...data })
export const fail = (error) => ({
  ok: false,
  error: error instanceof Error ? error.message : String(error),
})
