'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CONTENT_TYPES } from '@/lib/constants'

type Props = { month: string; contentType: string }

export function MonthlyReportFilters({ month, contentType }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/monthly-report?${params.toString()}`)
  }

  const cls = 'rounded-md border border-gray-300 px-2 py-1.5 text-xs bg-white'

  return (
    <div className="flex flex-wrap gap-2">
      <input type="month" className={cls} value={month} onChange={e => update('month', e.target.value)} />
      <select className={cls} value={contentType} onChange={e => update('content_type', e.target.value)}>
        <option value="">All Types</option>
        {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  )
}
