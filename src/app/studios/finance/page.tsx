import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSessionProfile } from '@/lib/auth'
import { usesFinanceDashboard } from '@/lib/views'
import { fetchFinanceBillingReport } from '@/lib/data/finance-billing'
import { parseFinanceBillingAnchor } from '@/lib/finance-billing-shared'
import { FinanceBillingClient } from '@/components/finance/FinanceBillingClient'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function FinanceBillingPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')
  if (!usesFinanceDashboard(profile.role)) redirect('/studios')

  const params = await searchParams
  const period = params.period === 'week' ? 'week' : 'month'
  const anchor = parseFinanceBillingAnchor({
    period,
    month: params.month,
    week: params.week,
  })
  const report = await fetchFinanceBillingReport(period, anchor)

  return (
    <Suspense fallback={null}>
      <FinanceBillingClient report={report} />
    </Suspense>
  )
}
