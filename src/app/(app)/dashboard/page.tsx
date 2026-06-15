import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { fetchProjects } from '@/lib/data/projects'
import { CollapsibleProjectSection } from '@/components/dashboard/CollapsibleProjectSection'
import { ExternalDashboard } from '@/components/dashboard/ExternalDashboard'
import { MonthFilter } from '@/components/dashboard/MonthFilter'
import { Card } from '@/components/ui/Card'
import { currentMonth, isDateInMonth } from '@/lib/utils'
import { FINAL_STAGE } from '@/lib/constants'
import {
  usesActionItemsDashboard,
  usesFullAdminDashboard,
  usesIpOverviewDashboard,
} from '@/lib/views'
import { CheckCircle, AlertTriangle, GitBranch } from 'lucide-react'

type SearchParams = Promise<Record<string, string | undefined>>

const STAT_CONFIG = [
  { key: 'onTime',   icon: CheckCircle,   color: 'text-emerald-400', glow: 'emerald' as const, label: 'Delivered on time' },
  { key: 'late',     icon: AlertTriangle, color: 'text-rose-400',    glow: 'rose' as const,    label: 'Delivered late' },
  { key: 'pipeline', icon: GitBranch,     color: 'text-indigo-400',  glow: 'indigo' as const,  label: 'In pipeline' },
]

function welcomeName(name: string): string {
  const first = name.trim().split(/\s+/)[0]
  return first || name
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  if (usesIpOverviewDashboard(profile.role)) {
    redirect('/ip-overview')
  }

  const projects = await fetchProjects()

  if (usesActionItemsDashboard(profile.role)) {
    return (
      <ExternalDashboard
        projects={projects}
        userId={profile.id}
        userName={profile.name}
      />
    )
  }

  if (!usesFullAdminDashboard(profile.role)) {
    redirect('/board')
  }

  const params = await searchParams
  const month = params.month ?? currentMonth()

  const inPipeline = projects.filter(p =>
    p.current_stage !== FINAL_STAGE && p.status_health !== 'On hold'
  )
  const delivered = projects.filter(p => p.current_stage === FINAL_STAGE)
  const onHold = projects.filter(p => p.status_health === 'On hold')

  const deliveredOnTime = projects.filter(p =>
    isDateInMonth(p.delivered_date, month) &&
    (!p.target_delivery_date || p.delivered_date! <= p.target_delivery_date)
  )
  const deliveredLate = projects.filter(p =>
    isDateInMonth(p.delivered_date, month) &&
    p.target_delivery_date &&
    p.delivered_date! > p.target_delivery_date
  )
  const inPipelineMonth = projects.filter(p =>
    p.current_stage !== FINAL_STAGE &&
    (isDateInMonth(p.picked_up_date, month) || isDateInMonth(p.received_date, month))
  )
  const counts = [deliveredOnTime.length, deliveredLate.length, inPipelineMonth.length]

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            Welcome {welcomeName(profile.name)}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Varsity production overview</p>
        </div>
        <Suspense fallback={null}>
          <MonthFilter month={month} />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STAT_CONFIG.map((s, i) => {
          const Icon = s.icon
          return (
            <Card key={s.key} glow={s.glow} className="p-4 text-center">
              <Icon size={20} className={`mx-auto mb-1.5 ${s.color}`} />
              <p className="text-2xl font-semibold text-zinc-100">{counts[i]}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{s.label}</p>
            </Card>
          )
        })}
      </div>

      <div className="space-y-3">
        <CollapsibleProjectSection
          title="In Pipeline"
          count={inPipeline.length}
          projects={inPipeline}
          iconName="pipeline"
          iconColor="bg-indigo-500/10 text-indigo-400"
          emptyMessage="No projects in pipeline."
        />
        <CollapsibleProjectSection
          title="Delivered"
          count={delivered.length}
          projects={delivered}
          iconName="delivered"
          iconColor="bg-emerald-500/10 text-emerald-400"
          emptyMessage="No delivered projects."
        />
        <CollapsibleProjectSection
          title="On Hold"
          count={onHold.length}
          projects={onHold}
          iconName="hold"
          iconColor="bg-zinc-500/10 text-zinc-400"
          emptyMessage="No projects on hold."
        />
      </div>
    </div>
  )
}
