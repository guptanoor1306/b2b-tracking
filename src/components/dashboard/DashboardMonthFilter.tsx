'use client'

import { MonthFilter } from '@/components/dashboard/MonthFilter'

type Props = { month: string }

export function DashboardMonthFilter({ month }: Props) {
  return <MonthFilter month={month} variant="light" />
}
