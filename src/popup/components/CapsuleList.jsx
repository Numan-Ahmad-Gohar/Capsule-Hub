import CapsuleCard from './CapsuleCard.jsx'
import { CapsuleIcon, SearchIcon } from '../icons.jsx'

/** Scrollable list of capsule cards, with tailored empty states. */
export default function CapsuleList({ capsules, totalCount, query, onSelect, onDelete }) {
  if (totalCount === 0) {
    return (
      <EmptyState
        icon={<CapsuleIcon width={30} height={30} />}
        title="No capsules yet"
        body="Open an AI conversation, then hit “Capsule this conversation” to distill and save its context here."
      />
    )
  }

  if (capsules.length === 0) {
    return (
      <EmptyState
        icon={<SearchIcon width={28} height={28} />}
        title="No matches"
        body={`Nothing matched “${query}”. Try a different keyword or tag.`}
      />
    )
  }

  return (
    <div className="ch-scroll flex-1 space-y-2 overflow-y-auto px-4 py-3">
      {capsules.map((c) => (
        <CapsuleCard key={c.id} capsule={c} onSelect={onSelect} onDelete={onDelete} />
      ))}
      <div className="pb-1 pt-1 text-center text-[10px] uppercase tracking-wide text-slate-300">
        {capsules.length} capsule{capsules.length === 1 ? '' : 's'}
      </div>
    </div>
  )
}

function EmptyState({ icon, title, body }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{body}</p>
    </div>
  )
}
