import Link from 'next/link'
import { ClipboardList, ArrowRight } from 'lucide-react'
import { Project } from '@/lib/types'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { formatDate } from '@/lib/utils'

type Props = {
  projects: Project[]
}

export function NewProjectsReceivedSection({ projects }: Props) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
          <ClipboardList size={16} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-zinc-900">New projects received</h2>
          <p className="text-xs text-zinc-500">{projects.length} awaiting review</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          No new client requests awaiting review.
        </p>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {projects.map(p => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 hover:border-amber-200 hover:shadow-sm transition-all"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 truncate group-hover:text-violet-700">
                  {p.title}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  Received {p.received_date ? formatDate(p.received_date, 'dd MMM yyyy') : '—'}
                  {p.target_delivery_date && (
                    <> · Release {formatDate(p.target_delivery_date, 'dd MMM')}</>
                  )}
                </p>
              </div>
              {p.external_team_member && (
                <AssigneeAvatar
                  name={p.external_team_member.name}
                  id={p.external_team_member.id}
                  size="sm"
                  theme="light"
                />
              )}
              <ArrowRight size={14} className="shrink-0 text-violet-300 group-hover:text-violet-500" />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
