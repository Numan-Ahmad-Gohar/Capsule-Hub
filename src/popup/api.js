/**
 * api.js — the popup's thin service layer.
 *
 * Wraps the background message calls the UI needs, so components stay declarative
 * and don't sprinkle chrome.* calls throughout. Storage reads/writes go directly
 * to the storage lib (chrome.storage is available in the popup context); anything
 * that needs the network or the active tab is routed through the background.
 */

import { MSG, sendToBackground } from '../lib/messaging.js'

/** Trigger a capture of the current conversation from the active tab. */
export async function captureActiveTab() {
  const res = await sendToBackground({ type: MSG.CAPTURE_ACTIVE_TAB })
  if (!res || !res.ok) throw new Error(res?.error || 'Capture failed.')
  return res.capsule
}

/** Inject formatted capsule text into the active tab's composer. */
export async function injectText(text) {
  const res = await sendToBackground({ type: MSG.INJECT_CAPSULE, text })
  if (!res || !res.ok) throw new Error(res?.error || 'Injection failed.')
  return res
}

/** Which supported platform is the active tab on (for enabling actions). */
export async function getActiveContext() {
  try {
    const res = await sendToBackground({ type: MSG.GET_ACTIVE_CONTEXT })
    return res && res.ok ? res : { platform: 'unknown' }
  } catch {
    return { platform: 'unknown' }
  }
}

/** Check connection to the backend distillation service. */
export async function testApiKey() {
  const res = await sendToBackground({ type: MSG.TEST_API_KEY })
  if (!res || !res.ok) throw new Error(res?.error || 'Backend connection failed.')
  return res
}
