import { PLATFORM_LABELS } from '../../lib/capsule-schema.js'
import { capsuleSubtitle } from '../../lib/format.js'
import { TrashIcon } from '../icons.jsx'

const PLATFORM_BADGE = {
  chatgpt: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  claude: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  gemini: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  unknown: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

function relativeTime(iso) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/** A single capsule row: click to preview, trash icon to delete. */
export default function CapsuleCard({ capsule, onSelect, onDelete }) {
  const badge = PLATFORM_BADGE[capsule.source_platform] || PLATFORM_BADGE.unknown

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(capsule)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(capsule)
      }}
      className="ch-fade-in group cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">{capsule.title}</h3>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(capsule.id)
          }}
          className="-mr-1 -mt-1 rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          aria-label="Delete capsule"
        >
          <TrashIcon width={15} height={15} />
        </button>
      </div>

      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
        {capsuleSubtitle(capsule)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${badge}`}
        >
          {PLATFORM_LABELS[capsule.source_platform] || 'Unknown'}
        </span>
        {capsule.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
          >
            #{tag}
          </span>
        ))}
        {capsule.tags.length > 3 && (
          <span className="text-[10px] text-slate-400">+{capsule.tags.length - 3}</span>
        )}
        <span className="ml-auto text-[10px] text-slate-400">{relativeTime(capsule.created_at)}</span>
      </div>
    </div>
  )
}
