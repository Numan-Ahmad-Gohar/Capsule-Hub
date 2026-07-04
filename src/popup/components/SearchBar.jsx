import { SearchIcon, CloseIcon } from '../icons.jsx'

/** Fuzzy-search input across the capsule library. */
export default function SearchBar({ value, onChange, count, total }) {
  if (total === 0) return null
  return (
    <div className="bg-slate-50 px-4 pt-3">
      <div className="relative">
        <SearchIcon
          width={16}
          height={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search capsules by title, goal, or tag…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Clear search"
          >
            <CloseIcon width={14} height={14} />
          </button>
        )}
      </div>
      {value && (
        <p className="px-1 pt-1.5 text-[11px] text-slate-400">
          {count} of {total} capsule{total === 1 ? '' : 's'}
        </p>
      )}
    </div>
  )
}
