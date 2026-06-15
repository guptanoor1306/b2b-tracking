import { redirect } from 'next/navigation'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function MonthlyReportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const q = params.month ? `?month=${params.month}` : ''
  redirect(`/dashboard${q}`)
}
