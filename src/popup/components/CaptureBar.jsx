import { PLATFORM_LABELS } from '../../lib/capsule-schema.js'
import { SparkleIcon } from '../icons.jsx'

/**
 * The primary call-to-action: capture the conversation in the active tab. Shows
 * live pipeline status while distilling, and gives clear guidance when the user
 * isn't on a supported page or hasn't set a key.
 */
export default function CaptureBar({ context, capturing, captureStage, hasKey, onCapture }) {
  const onSupported = ['chatgpt', 'claude', 'gemini'].includes(context.platform)
  const platformLabel = PLATFORM_LABELS[context.platform] || null

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={onCapture}
        disabled={capturing || !onSupported}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition enabled:hover:shadow-md enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {capturing ? (
          <>
            <span className="ch-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-white" />
            <span>Working…</span>
          </>
        ) : (
          <>
            <SparkleIcon width={18} height={18} />
            <span>Capsule this conversation</span>
          </>
        )}
      </button>

      <div className="mt-2 min-h-[16px] text-center text-[11px]">
        {capturing && captureStage ? (
          <span className="text-brand-600">{captureStage}</span>
        ) : onSupported ? (
          <span className="text-slate-500">
            On <span className="font-semibold text-slate-700">{platformLabel}</span>
            {!hasKey && ' · add an API key in Settings to distill'}
          </span>
        ) : (
          <span className="text-slate-400">
            Open a ChatGPT, Claude, or Gemini tab to capture
          </span>
        )}
      </div>
    </div>
  )
}
