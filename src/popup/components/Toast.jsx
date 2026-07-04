import { useEffect, useState } from 'react'
import { CheckIcon, CloseIcon } from '../icons.jsx'

/**
 * Transient feedback banner anchored to the bottom of the popup. Auto-dismisses
 * after a few seconds; `key` on the parent remounts it for each new message.
 */
export default function Toast({ kind = 'ok', title, body, onDone }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 3400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(onDone, 220)
    return () => clearTimeout(t)
  }, [leaving, onDone])

  const isOk = kind === 'ok'

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <div
        className={`pointer-events-auto flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 shadow-lg transition-all duration-200 ${
          leaving ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        } ${isOk ? 'border-emerald-200 bg-white' : 'border-red-200 bg-white'}`}
      >
        <div
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white ${
            isOk ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        >
          {isOk ? <CheckIcon width={13} height={13} /> : <CloseIcon width={13} height={13} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800">{title}</p>
          {body && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{body}</p>}
        </div>
        <button
          type="button"
          onClick={() => setLeaving(true)}
          className="rounded p-0.5 text-slate-300 transition hover:text-slate-600"
          aria-label="Dismiss"
        >
          <CloseIcon width={14} height={14} />
        </button>
      </div>
    </div>
  )
}
