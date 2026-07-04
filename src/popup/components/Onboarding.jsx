import { useState } from 'react'
import { CapsuleIcon, SparkleIcon, InjectIcon, SettingsIcon } from '../icons.jsx'

/**
 * A brief first-run walkthrough (4 steps). Non-blocking: the user can skip at any
 * time. Marks settings.onboarded once dismissed so it never nags again.
 */
const STEPS = [
  {
    icon: <SettingsIcon width={26} height={26} />,
    title: 'Add your API key',
    body: 'Capsule Hub uses your own OpenAI or Anthropic key to distill conversations. Set it in Settings — it stays on your device.',
  },
  {
    icon: <SparkleIcon width={26} height={26} />,
    title: 'Capture a conversation',
    body: 'On ChatGPT, Claude, or Gemini, click “Capsule this conversation.” The AI extracts your goal, decisions, constraints, and code into a structured capsule.',
  },
  {
    icon: <CapsuleIcon width={26} height={26} />,
    title: 'Search your library',
    body: 'Every capsule is saved locally, tagged, and fuzzy-searchable — so your project context is never lost between tools.',
  },
  {
    icon: <InjectIcon width={26} height={26} />,
    title: 'Reuse anywhere',
    body: 'Open a different AI tool, pick a capsule, and inject the formatted context as your first message. Review it, then send. No more re-explaining.',
  },
]

export default function Onboarding({ onDone, onOpenSettings }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="ch-fade-in w-full overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col items-center px-6 pb-5 pt-7 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-md">
            {current.icon}
          </div>
          <h2 className="text-base font-bold text-slate-900">{current.title}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{current.body}</p>

          {/* progress dots */}
          <div className="mt-4 flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onDone}
            className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step === 0 && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Open Settings
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
            >
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
