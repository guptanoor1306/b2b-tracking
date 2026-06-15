import Link from 'next/link'
import { Project } from '@/lib/types'
import { Card } from '@/components/ui/Card'
import { formatWaitingSince } from '@/lib/utils'
import { FINAL_STAGE } from '@/lib/constants'
import { PlayCircle, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'

type Props = {
  projects: Project[]
  userId: string
  userName: string
}

function welcomeName(name: string): string {
  const first = name.trim().split(/\s+/)[0]
  return first || name
}

export function ExternalDashboard({ projects, userId, userName }: Props) {
  const inPipeline = projects.filter(p => p.current_stage !== FINAL_STAGE)
  const delivered = projects.filter(p => p.current_stage === FINAL_STAGE)
  const actionItems = projects.filter(
    p => p.stage_assignee_id === userId && p.current_stage !== FINAL_STAGE
  )

  const statCards = [
    { key: 'pipeline', label: 'In Pipeline', count: inPipeline.length, icon: PlayCircle, color: 'text-indigo-400', glow: 'indigo' as const, href: '/board' },
    { key: 'delivered', label: 'Delivered', count: delivered.length, icon: CheckCircle2, color: 'text-emerald-400', glow: 'emerald' as const, href: '/board' },
  ]

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">
          Welcome {welcomeName(userName)}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">Varsity production overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {statCards.map(s => {
          const Icon = s.icon
          return (
            <Link key={s.key} href={s.href} className="block group">
              <Card glow={s.glow} className="p-4 text-center transition-colors group-hover:border-indigo-500/30 cursor-pointer">
                <Icon size={20} className={`mx-auto mb-1.5 ${s.color}`} />
                <p className="text-2xl font-semibold text-zinc-100">{s.count}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">{s.label}</p>
              </Card>
            </Link>
          )
        })}
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-amber-400" />
          <div>
            <h2 className="text-sm font-medium text-zinc-200">Action items</h2>
            <p className="text-xs text-zinc-500">
              Assigned to you · {actionItems.length}
            </p>
          </div>
        </div>

        {actionItems.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="text-sm text-zinc-500">No pending action items assigned to you.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {actionItems.map(p => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group block rounded-md border-2 border-indigo-500/25 bg-indigo-500/[0.03] px-4 py-3.5 hover:border-indigo-500/45 hover:bg-indigo-500/[0.06] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-indigo-200 transition-colors">
                      {p.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-xs text-zinc-500">{p.current_stage}</span>
                      <span className="text-xs text-amber-400">
                        {formatWaitingSince(p.last_status_update_at)} waiting
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-indigo-500/30 bg-indigo-500/10 group-hover:border-indigo-400/50 transition-colors">
                    <ChevronRight size={16} className="text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
