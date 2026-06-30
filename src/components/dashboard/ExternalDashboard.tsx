import Link from 'next/link'
import { isUserOnProjectTeam } from '@/lib/projects/team'
import { Project } from '@/lib/types'
import { formatWaitingSince, formatDate } from '@/lib/utils'
import { resolveTargetReleaseDate } from '@/lib/timelines'
import { FINAL_STAGE } from '@/lib/constants'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { welcomeFirstName } from '@/lib/design/theme-v2'
import {
  PlayCircle, CheckCircle2, Zap, ArrowRight, Clock,
} from 'lucide-react'

type Props = {
  projects: Project[]
  userId: string
  userName: string
  holidays?: string[]
}

export function ExternalDashboard({ projects, userId, userName, holidays = [] }: Props) {
  const myProjects = projects.filter(
    p => isUserOnProjectTeam(p, userId) && p.current_stage !== FINAL_STAGE
  )
  const inPipeline = myProjects
  const delivered = projects.filter(
    p => isUserOnProjectTeam(p, userId) && p.current_stage === FINAL_STAGE
  )
  const actionItems = projects.filter(
    p => p.stage_assignee_id === userId && p.current_stage !== FINAL_STAGE
  )

  const statCards = [
    { key: 'pipeline', label: 'In Pipeline', count: inPipeline.length, icon: PlayCircle, iconBg: 'bg-violet-100 text-violet-600', href: '/board' },
    { key: 'delivered', label: 'Delivered', count: delivered.length, icon: CheckCircle2, iconBg: 'bg-emerald-100 text-emerald-600', href: '/board' },
  ]

  return (
    <div className="theme-v2 -mx-6 -mt-2 min-h-[calc(100vh-4rem)] px-6 pb-10 pt-2">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Welcome, {welcomeFirstName(userName)}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Your workspace · {actionItems.length} action item{actionItems.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statCards.map(s => {
            const Icon = s.icon
            return (
              <Link key={s.key} href={s.href} className="block group">
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm text-center transition-all group-hover:border-violet-200 group-hover:shadow-md">
                  <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 tabular-nums">{s.count}</p>
                  <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
                </div>
              </Link>
            )
          })}
        </div>

        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-orange-500" />
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Next best actions</h2>
              <p className="text-xs text-zinc-500">Assigned to you · focus here first</p>
            </div>
          </div>

          {actionItems.length === 0 ? (
            <div className="py-10 text-center rounded-xl bg-zinc-50 border border-dashed border-zinc-200">
              <p className="text-sm text-zinc-500">No pending action items assigned to you.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {actionItems.map(p => {
                const target = resolveTargetReleaseDate(p, holidays)
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3.5 hover:border-zinc-300 hover:shadow-sm transition-all border-l-2 border-l-amber-500"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate group-hover:text-violet-700">
                        {p.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="text-[11px] text-zinc-500">{p.current_stage}</span>
                        <span className="text-[11px] font-medium text-orange-600">
                          {formatWaitingSince(p.last_status_update_at)} waiting
                        </span>
                        {target && (
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <Clock size={11} />
                            {formatDate(target, 'dd MMM')}
                          </span>
                        )}
                      </div>
                    </div>
                    <AssigneeAvatar name={userName} id={userId} size="md" theme="light" />
                    <span className="text-xs font-semibold text-violet-600 shrink-0 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                      Open <ArrowRight size={14} />
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
