import { useState } from 'react'
import { saveSettings, exportCapsules } from '../../lib/storage.js'
import { testApiKey } from '../api.js'
import { CheckIcon } from '../icons.jsx'

/**
 * Per-provider metadata drives the whole form, so adding a provider is a one-line
 * change here (plus the matching entry in llm-client's registry).
 */
const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    keyField: 'openaiApiKey',
    modelField: 'openaiModel',
    placeholder: 'sk-…',
    modelHint: 'e.g. gpt-4o-mini — small & cheap keeps distillation costs low.',
  },
  anthropic: {
    label: 'Anthropic',
    keyField: 'anthropicApiKey',
    modelField: 'anthropicModel',
    placeholder: 'sk-ant-…',
    modelHint: 'e.g. claude-haiku-4-5-20251001 — fast and inexpensive.',
  },
  openrouter: {
    label: 'OpenRouter',
    keyField: 'openrouterApiKey',
    modelField: 'openrouterModel',
    placeholder: 'sk-or-v1-…',
    modelHint: 'Any OpenRouter slug, e.g. openai/gpt-4o-mini or a “…:free” model.',
  },
}

/**
 * Settings panel: provider choice, per-provider API key + model, capture cost
 * cap, and a cloud-sync toggle (reserved for the Supabase adapter on the
 * roadmap). Keys live in chrome.storage.local — see the privacy note at the end.
 */
export default function Settings({ settings, onSaved, onNotify }) {
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const provider = PROVIDERS[form.provider] || PROVIDERS.openai
  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const persist = async (patch) => {
    setSaving(true)
    try {
      const next = await saveSettings(patch)
      setForm(next)
      onSaved(next)
    } catch (e) {
      onNotify('err', 'Could not save settings', e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    // Persist the current form first so the worker tests what the user typed.
    await persist(form)
    setTesting(true)
    try {
      await testApiKey()
      onNotify('ok', 'API key works', `Your ${provider.label} key is valid.`)
    } catch (e) {
      onNotify('err', 'Key check failed', e.message)
    } finally {
      setTesting(false)
    }
  }

  const handleExport = async () => {
    try {
      const json = await exportCapsules()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'capsule-hub-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      onNotify('err', 'Export failed', e.message)
    }
  }

  return (
    <div className="ch-scroll flex-1 space-y-5 overflow-y-auto px-4 py-4">
      {/* Provider */}
      <Field label="AI provider" hint="Which API distills your conversations.">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PROVIDERS).map(([id, p]) => (
            <button
              key={id}
              type="button"
              onClick={() => update({ provider: id })}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                form.provider === id
                  ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      {/* API key */}
      <Field
        label={`${provider.label} API key`}
        hint="Stored locally on this device. Never sent anywhere except the provider."
      >
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={form[provider.keyField] || ''}
          onChange={(e) => update({ [provider.keyField]: e.target.value })}
          placeholder={provider.placeholder}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </Field>

      {/* Model */}
      <Field label="Model" hint={provider.modelHint}>
        <input
          type="text"
          value={form[provider.modelField] || ''}
          onChange={(e) => update({ [provider.modelField]: e.target.value })}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </Field>

      {/* Max turns */}
      <Field
        label={`Capture depth — last ${form.maxTurns} turns`}
        hint="Caps how much of the conversation is sent to the API (cost control)."
      >
        <input
          type="range"
          min="6"
          max="80"
          step="2"
          value={form.maxTurns}
          onChange={(e) => update({ maxTurns: Number(e.target.value) })}
          className="w-full accent-brand-600"
        />
      </Field>

      {/* Cloud sync (roadmap) */}
      <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-slate-700">Cloud sync</p>
          <p className="text-[11px] text-slate-400">Supabase multi-device sync — coming soon.</p>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
          Roadmap
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => persist(form)}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : (<><CheckIcon width={16} height={16} /> Save</>)}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {testing ? 'Testing…' : 'Test key'}
        </button>
      </div>

      <button
        type="button"
        onClick={handleExport}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
      >
        Export all capsules (.json)
      </button>

      <p className="border-t border-slate-100 pt-3 text-[10px] leading-relaxed text-slate-400">
        🔒 Your API key and capsules are stored only in this browser via
        chrome.storage.local. Conversation text is sent to your chosen AI provider
        solely to generate a capsule. Nothing is sent to any Capsule Hub server.
      </p>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p>}
    </div>
  )
}
