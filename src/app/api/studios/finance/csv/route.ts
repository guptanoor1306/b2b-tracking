import { getSessionProfile } from '@/lib/auth'
import { usesFinanceDashboard } from '@/lib/views'
import { fetchFinanceBillingReport } from '@/lib/data/finance-billing'
import {
  exportFinanceBillingCsv,
  parseFinanceBillingAnchor,
} from '@/lib/finance-billing-shared'

export async function GET(request: Request) {
  const profile = await getSessionProfile()
  if (!profile || !usesFinanceDashboard(profile.role)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = new URL(request.url)
  const period = url.searchParams.get('period') === 'week' ? 'week' : 'month'
  const anchor = parseFinanceBillingAnchor({
    period,
    month: url.searchParams.get('month') ?? undefined,
    week: url.searchParams.get('week') ?? undefined,
  })

  const report = await fetchFinanceBillingReport(period, anchor)
  const csv = exportFinanceBillingCsv(report)
  const slug = period === 'month' ? report.monthKey : `week-${report.weekStartKey}`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="billing-${slug}.csv"`,
    },
  })
}
