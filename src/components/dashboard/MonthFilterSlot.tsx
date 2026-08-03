import { Suspense } from 'react'
import { DashboardMonthFilter } from '@/components/dashboard/DashboardMonthFilter'

export function MonthFilterSlot({ month }: { month: string }) {
  return (
    <Suspense
      fallback={
        <div className="inline-flex h-[42px] min-w-[200px] animate-pulse rounded-xl border border-zinc-200/80 bg-zinc-100" />
      }
    >
      <DashboardMonthFilter month={month} />
    </Suspense>
  )
}
