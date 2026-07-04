import { useState } from 'react'
import { PLATFORM_LABELS } from '../../lib/capsule-schema.js'
import { formatCapsuleForPlatform } from '../../lib/format.js'
import { injectText } from '../api.js'
import {
  CloseIcon,
  InjectIcon,
  CopyIcon,
  TrashIcon,
  CheckIcon,
} from '../icons.jsx'

/**
 * Full-screen (within the popup) capsule detail overlay. Shows every distilled
 * field and offers the two reuse actions:
 *   - Inject into the active tab's composer (never auto-sends)
 *   - Copy the formatted preamble to the clipboard (works anywhere)
 */
export default function CapsulePreview({ capsule, context, onClose, onDelete, onNotify }) {
  const [injecting, setInjecting] = useState(false)
  const [copied, setCopied] = useState(false)

  const targetPlatform = ['chatgpt', 'claude', 'gemini'].includes(context.platform)
    ? context.platform
    : capsule.source_platform
  const formatted = formatCapsuleForPlatform(capsule, targetPlatform)
  const canInject = ['chatgpt', 'claude', 'gemini'].includes(context.platform)

  const handleInject = async () => {
    setInjecting(true)
    try {
      await injectText(formatted)
      onNotify('ok', 'Loaded into composer', 'Review it, then send when you’re ready.')
      onClose()
    } catch (e) {
      onNotify('err', 'Injection failed', e.message)
    } finally {
      setInjecting(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      onNotify('err', 'Copy failed', 'Clipboard access was blocked.')
    }
  }

  return (
    <div className="ch-fade-in absolute inset-0 z-20 flex flex-col bg-white">
      {/* header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-slate-900">{capsule.title}</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            From {PLATFORM_LABELS[capsule.source_platform]} ·{' '}
            {new Date(capsule.created_at).toLocaleString()}
            {capsule.turn_count ? ` · ${capsule.turn_count} turns` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <CloseIcon />
        </button>
      </div>

      {/* body */}
      <div className="ch-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {capsule.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {capsule.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <Section title="Goal" show={!!capsule.goal}>
          <p className="text-xs leading-relaxed text-slate-700">{capsule.goal}</p>
        </Section>

        <ListSection title="Constraints & Preferences" items={capsule.constraints} />
        <ListSection title="Key Decisions" items={capsule.key_decisions} />
        <ListSection title="Open Questions / Next Steps" items={capsule.open_questions} />

        <Section title="Code Snippets" show={capsule.code_snippets.length > 0}>
          <div className="space-y-2">
            {capsule.code_snippets.map((s, i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-slate-200">
                <div className="flex items-center justify-between bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500">
                  <span className="font-medium text-slate-600">{s.language || 'code'}</span>
                  {s.context && <span className="truncate pl-2">{s.context}</span>}
                </div>
                <pre className="ch-scroll overflow-x-auto bg-slate-900 p-2.5 text-[11px] leading-relaxed text-slate-100">
                  <code>{s.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </Section>

        {capsule.raw_excerpt && (
          <Section title="Original Excerpt" show>
            <p className="rounded-lg bg-slate-50 p-2.5 text-[11px] italic leading-relaxed text-slate-500">
              {capsule.raw_excerpt}
            </p>
          </Section>
        )}
      </div>

      {/* footer actions */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleInject}
            disabled={!canInject || injecting}
            title={canInject ? '' : 'Open a supported AI tab to inject'}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {injecting ? (
              <span className="ch-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <InjectIcon />
            )}
            <span>
              {canInject ? `Inject into ${PLATFORM_LABELS[context.platform]}` : 'Inject (open AI tab)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            title="Copy formatted context"
          >
            {copied ? <CheckIcon className="text-emerald-500" /> : <CopyIcon />}
          </button>

          <button
            type="button"
            onClick={() => onDelete(capsule.id)}
            className="flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            aria-label="Delete capsule"
          >
            <TrashIcon />
          </button>
        </div>
        {!canInject && (
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            Tip: open ChatGPT, Claude, or Gemini, then reopen this to inject — or use Copy.
          </p>
        )}
      </div>
    </div>
  )
}

function Section({ title, show, children }) {
  if (!show) return null
  return (
    <div>
      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h4>
      {children}
    </div>
  )
}

function ListSection({ title, items }) {
  if (!items || items.length === 0) return null
  return (
    <Section title={title} show>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-700">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
