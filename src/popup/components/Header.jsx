import { CapsuleIcon, SettingsIcon, ArrowLeftIcon } from '../icons.jsx'

/**
 * Top app bar with the brand mark and a Settings toggle. Doubles as a back
 * button when the settings view is open.
 */
export default function Header({ view, onNavigate }) {
  const inSettings = view === 'settings'
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 text-white shadow-sm">
          <CapsuleIcon width={18} height={18} />
        </div>
        <div className="leading-tight">
          <h1 className="text-[15px] font-bold text-slate-900">Capsule Hub</h1>
          <p className="text-[11px] text-slate-500">Carry context across AI tools</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onNavigate(inSettings ? 'list' : 'settings')}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        title={inSettings ? 'Back to capsules' : 'Settings'}
        aria-label={inSettings ? 'Back to capsules' : 'Settings'}
      >
        {inSettings ? <ArrowLeftIcon /> : <SettingsIcon />}
      </button>
    </header>
  )
}
