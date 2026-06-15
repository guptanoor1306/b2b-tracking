'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarDays } from 'lucide-react'

type Props = { month: string }

export function MonthFilter({ month }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', value)
    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  return (
    <label className="glow-card-static inline-flex items-center gap-2.5 px-4 py-2.5 cursor-pointer">
      <CalendarDays size={16} className="text-indigo-400 shrink-0" />
      <input
        type="month"
        value={month}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent border-none text-sm text-zinc-200 focus:outline-none cursor-pointer"
      />
    </label>
  )
}
