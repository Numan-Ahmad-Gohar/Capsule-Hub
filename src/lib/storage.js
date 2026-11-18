/**
 * storage.js
 *
 * A thin, swappable abstraction over the persistence backend. Today it wraps
 * `chrome.storage.local`; the interface (saveCapsule / getCapsules /
 * deleteCapsule / searchCapsules) is deliberately backend-agnostic so a Supabase
 * cloud-sync adapter can be dropped in behind the same functions without the UI
 * or background worker changing a single line.
 *
 * Design notes:
 *  - Capsules are stored under a single key as an array. For a personal tool the
 *    volume is small (tens–hundreds), so this keeps reads/writes simple and
 *    atomic. A per-key scheme would be the next step at scale.
 *  - All writes go through normalizeCapsule() so nothing malformed lands on disk.
 *  - Search is client-side (Fuse.js) — no data leaves the device unless the user
 *    explicitly enables cloud sync. Privacy-first by default.
 */

import Fuse from 'fuse.js'
import { normalizeCapsule } from './capsule-schema.js'

const CAPSULES_KEY = 'capsules'
const SETTINGS_KEY = 'settings'

export const DEFAULT_SETTINGS = Object.freeze({
  backendUrl: 'https://capsule-hub-proxy.capsulehub.workers.dev',
  maxTurns: 40, // cap conversation turns sent to the LLM (cost control)
  cloudSync: false, // reserved for the Supabase adapter (roadmap)
  onboarded: false,
})

// --- low-level chrome.storage.local promise helpers -------------------------
function getRaw(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      const err = chrome.runtime.lastError
      if (err) return reject(new Error(err.message))
      resolve(result[key])
    })
  })
}

function setRaw(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      const err = chrome.runtime.lastError
      if (err) {
        // Most commonly QUOTA_BYTES exceeded — surface a friendly message.
        return reject(new Error(friendlyStorageError(err.message)))
      }
      resolve()
    })
  })
}

function friendlyStorageError(message) {
  if (/quota/i.test(message)) {
    return 'Local storage is full. Delete a few old capsules and try again.'
  }
  return message || 'Failed to write to local storage.'
}

// --- Settings ----------------------------------------------------------------
export async function getSettings() {
  const stored = (await getRaw(SETTINGS_KEY)) || {}
  return { ...DEFAULT_SETTINGS, ...stored }
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch }
  if (typeof next.backendUrl === 'string') {
    next.backendUrl = next.backendUrl.trim().replace(/\/+$/, '')
  }
  await setRaw(SETTINGS_KEY, next)
  return next
}

// --- Capsules ----------------------------------------------------------------
export async function getCapsules() {
  const list = (await getRaw(CAPSULES_KEY)) || []
  if (!Array.isArray(list)) return []
  // Normalise on read so schema upgrades are transparent to callers.
  return list.map((c) => normalizeCapsule(c)).sort(byNewestFirst)
}

function byNewestFirst(a, b) {
  return new Date(b.created_at) - new Date(a.created_at)
}

export async function getCapsule(id) {
  const list = await getCapsules()
  return list.find((c) => c.id === id) || null
}

/**
 * Insert or update a capsule. Returns the normalised, persisted capsule.
 */
export async function saveCapsule(capsule) {
  const normalized = normalizeCapsule(capsule)
  const list = (await getRaw(CAPSULES_KEY)) || []
  const idx = list.findIndex((c) => c.id === normalized.id)
  if (idx >= 0) list[idx] = normalized
  else list.unshift(normalized)
  await setRaw(CAPSULES_KEY, list)
  return normalized
}

export async function deleteCapsule(id) {
  const list = (await getRaw(CAPSULES_KEY)) || []
  const next = list.filter((c) => c.id !== id)
  await setRaw(CAPSULES_KEY, next)
  return next.length
}

export async function clearAllCapsules() {
  await setRaw(CAPSULES_KEY, [])
}

/**
 * Fuzzy search across the most meaningful fields. Falls back to returning the
 * full (already newest-first) list when the query is empty.
 */
export async function searchCapsules(query) {
  const list = await getCapsules()
  const q = (query || '').trim()
  if (!q) return list

  const fuse = new Fuse(list, {
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: false,
    keys: [
      { name: 'title', weight: 0.35 },
      { name: 'goal', weight: 0.3 },
      { name: 'tags', weight: 0.2 },
      { name: 'key_decisions', weight: 0.08 },
      { name: 'constraints', weight: 0.07 },
    ],
  })
  return fuse.search(q).map((r) => r.item)
}

/**
 * Subscribe to capsule changes triggered anywhere (e.g. a capture completing in
 * the background while the popup is open). Returns an unsubscribe fn.
 */
export function onCapsulesChanged(callback) {
  const listener = (changes, area) => {
    if (area === 'local' && changes[CAPSULES_KEY]) {
      callback((changes[CAPSULES_KEY].newValue || []).map((c) => normalizeCapsule(c)))
    }
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

/** Export all capsules as a JSON string (portability / backup feature). */
export async function exportCapsules() {
  const list = await getCapsules()
  return JSON.stringify({ version: 1, exported_at: new Date().toISOString(), capsules: list }, null, 2)
}

/** Import capsules from an exported JSON string (merges without duplicates). */
export async function importCapsules(jsonString) {
  let parsed
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    throw new Error('Invalid JSON file. Please select a valid Capsule Hub backup.')
  }

  const incoming = Array.isArray(parsed) ? parsed : parsed?.capsules
  if (!Array.isArray(incoming)) {
    throw new Error('No valid capsules found in this backup file.')
  }

  const existing = (await getRaw(CAPSULES_KEY)) || []
  const byId = new Map(existing.map((c) => [c.id, c]))

  let added = 0
  for (const item of incoming) {
    const normalized = normalizeCapsule(item)
    if (!byId.has(normalized.id)) added++
    byId.set(normalized.id, normalized)
  }

  const merged = Array.from(byId.values()).sort(byNewestFirst)
  await setRaw(CAPSULES_KEY, merged)
  return { total: merged.length, added }
}
