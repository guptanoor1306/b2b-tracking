import {
  addDays,
  addHours,
  differenceInHours,
  endOfDay,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns'

export function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

export function isHoliday(d: Date, holidays: Set<string>): boolean {
  return holidays.has(toDateKey(d))
}

export function isBusinessDay(d: Date, holidays: Set<string>): boolean {
  return !isWeekend(d) && !isHoliday(d, holidays)
}

function nextBusinessDayStart(d: Date, holidays: Set<string>): Date {
  let cur = startOfDay(addDays(d, 1))
  while (!isBusinessDay(cur, holidays)) {
    cur = addDays(cur, 1)
  }
  return cur
}

export function addBusinessHours(start: Date, hours: number, holidays: string[] = []): Date {
  const holidaySet = new Set(holidays)
  let cur = new Date(start)
  let remaining = hours

  while (remaining > 0) {
    if (!isBusinessDay(cur, holidaySet)) {
      cur = nextBusinessDayStart(cur, holidaySet)
      continue
    }
    const dayEnd = endOfDay(cur)
    const available = Math.max(0, differenceInHours(dayEnd, cur))
    if (remaining <= available) {
      return addHours(cur, remaining)
    }
    remaining -= available
    cur = nextBusinessDayStart(cur, holidaySet)
  }

  return cur
}

export function businessHoursBetween(start: Date, end: Date, holidays: string[] = []): number {
  const holidaySet = new Set(holidays)
  if (end <= start) return 0

  let total = 0
  let cur = new Date(start)

  while (cur < end) {
    if (!isBusinessDay(cur, holidaySet)) {
      cur = nextBusinessDayStart(cur, holidaySet)
      continue
    }
    const segmentEnd = end < endOfDay(cur) ? end : endOfDay(cur)
    total += differenceInHours(segmentEnd, cur)
    cur = nextBusinessDayStart(cur, holidaySet)
  }

  return total
}

export function businessDaysLate(targetDateStr: string, holidays: string[] = []): number {
  const target = parseISO(targetDateStr)
  if (!isValid(target)) return 0

  const holidaySet = new Set(holidays)
  const today = startOfDay(new Date())
  const targetDay = startOfDay(target)
  if (today <= targetDay) return 0

  let late = 0
  let cur = addDays(targetDay, 1)
  while (cur <= today) {
    if (isBusinessDay(cur, holidaySet)) late++
    cur = addDays(cur, 1)
  }
  return late
}

export function splitBusinessHours(totalHours: number): { days: number; hours: number } {
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 }
}

export function formatBusinessWaiting(hours: number): string {
  if (hours < 1) return '< 1h'
  if (hours < 24) return `${Math.round(hours)}h`
  const days = Math.floor(hours / 24)
  const rem = Math.round(hours % 24)
  if (rem === 0) return `${days}d`
  return `${days}d ${rem}h`
}
