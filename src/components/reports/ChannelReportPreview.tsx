'use client'

import { ChannelReport, formatReportRate } from '@/lib/reports/channel-report'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, GitBranch, PauseCircle, TrendingUp, ThumbsUp,
  Inbox, XCircle, PackageOpen,
} from 'lucide-react'

type Props = {
  report: ChannelReport
}

function StatTile({
  label, value, sub, icon: Icon, tone = 'default',
}: {
  label: string
  value: string | number
  sub?: string
  icon: typeof GitBranch
  tone?: 'default' | 'emerald' | 'violet' | 'orange' | 'zinc' | 'amber' | 'red' | 'sky'
}) {
  const tones = {
    default: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-600',
    zinc: 'bg-zinc-100 text-zinc-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    sky: 'bg-sky-50 text-sky-600',
  }
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <div className={cn('rounded-md p-1', tones[tone])}>
          <Icon size={14} />
        </div>
        <span className="text-[11px] font-medium text-zinc-500">{label}</span>
      </div>
      <p className="text-xl font-semibold tabular-nums text-zinc-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>}
    </div>
  )
}

function IpCard({ row }: { row: ChannelReport['ipBreakdown'][number] }) {
  const total = row.total
  const segments = [
    { key: 'delivered', count: row.delivered, color: 'bg-emerald-500', label: 'Delivered' },
    { key: 'pipeline', count: row.inPipeline, color: 'bg-violet-500', label: 'Pipeline' },
    { key: 'hold', count: row.onHold, color: 'bg-zinc-400', label: 'On hold' },
  ]

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-zinc-900">{row.ip || '—'}</p>
          <p className="text-xs text-zinc-500">{total} video{total === 1 ? '' : 's'} in production</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-700">
          {total}
        </span>
      </div>

      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-zinc-100">
        {segments.map(seg => seg.count > 0 && (
          <div
            key={seg.key}
            className={cn('h-full', seg.color)}
            style={{ width: `${(seg.count / total) * 100}%` }}
            title={`${seg.label}: ${seg.count}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-emerald-50 px-2 py-2">
          <p className="text-lg font-bold tabular-nums text-emerald-700">{row.delivered}</p>
          <p className="text-[10px] font-medium text-emerald-600">Delivered</p>
        </div>
        <div className="rounded-lg bg-violet-50 px-2 py-2">
          <p className="text-lg font-bold tabular-nums text-violet-700">{row.inPipeline}</p>
          <p className="text-[10px] font-medium text-violet-600">Pipeline</p>
          {(row.atRisk > 0 || row.delayed > 0) && (
            <p className="mt-0.5 text-[10px] text-orange-600">
              {row.delayed > 0 && `${row.delayed} delayed`}
              {row.delayed > 0 && row.atRisk > 0 && ' · '}
              {row.atRisk > 0 && `${row.atRisk} at risk`}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-zinc-100 px-2 py-2">
          <p className="text-lg font-bold tabular-nums text-zinc-700">{row.onHold}</p>
          <p className="text-[10px] font-medium text-zinc-600">On hold</p>
        </div>
      </div>
    </div>
  )
}

export function ChannelReportPreview({ report }: Props) {
  const { summary } = report
  const pipelineSub = summary.inPipeline > 0
    ? [
        summary.pipelineDelayed > 0 ? `${summary.pipelineDelayed} delayed` : null,
        summary.pipelineAtRisk > 0 ? `${summary.pipelineAtRisk} at risk` : null,
      ].filter(Boolean).join(' · ')
    : undefined

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 px-4 py-3">
        <p className="text-sm font-semibold text-zinc-900">{report.timeframeLabel}</p>
        <p className="text-xs text-zinc-600">
          {report.periodStart} – {report.periodEnd} · {report.channelName}
        </p>
        <p className="mt-1 text-[11px] text-zinc-500">
          {summary.relevantVideos} videos in this period
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Production</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="In pipeline" value={summary.inPipeline} sub={pipelineSub} icon={GitBranch} tone="violet" />
          <StatTile label="Delivered" value={summary.delivered} icon={CheckCircle2} tone="emerald" />
          <StatTile label="On hold" value={summary.onHold} icon={PauseCircle} tone="zinc" />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Intake</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile label="Requests received" value={summary.requestsReceived} icon={Inbox} tone="sky" sub="Awaiting review" />
          <StatTile label="Requests declined" value={summary.requestsDeclined} icon={XCircle} tone="red" />
          <StatTile label="New projects to pick" value={summary.toBePicked} icon={PackageOpen} tone="amber" sub="Ready to Produce" />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Performance rates</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatTile
            label="Delivery rate"
            value={formatReportRate(summary.deliveryRate)}
            sub={`${summary.delivered} delivered (production videos)`}
            icon={TrendingUp}
          />
          <StatTile
            label="Approval rate"
            value={formatReportRate(summary.approvalRate)}
            sub={`${summary.approvedRequests} approved · ${summary.declinedRequests} declined`}
            icon={ThumbsUp}
            tone="emerald"
          />
        </div>
      </section>

      {report.ipBreakdown.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">By IP</h3>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Production videos split by intellectual property
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.ipBreakdown.map(row => (
              <IpCard key={row.ip || '__blank__'} row={row} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}