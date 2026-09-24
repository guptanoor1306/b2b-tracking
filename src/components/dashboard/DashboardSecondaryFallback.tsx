import { SuperadminInsightsFallback } from '@/components/dashboard/SuperadminInsightsFallback'

type Props = {
  showInsights: boolean
  showTimelineInsights?: boolean
}

export function DashboardSecondaryFallback({ showInsights, showTimelineInsights = false }: Props) {
  return (
    <div className="contents">
      <div className="min-h-[12rem] animate-pulse rounded-2xl border border-zinc-200/80 bg-zinc-50/80" aria-busy="true" aria-label="Loading recent comments" />
      {showInsights ? (
        <div className="col-span-full">
          <SuperadminInsightsFallback showTimeline={showTimelineInsights} />
        </div>
      ) : null}
    </div>
  )
}
