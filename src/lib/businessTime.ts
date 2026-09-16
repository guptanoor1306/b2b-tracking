import {
  addDays,
  addMinutes,
  differenceInMinutes,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns'

/** Office window for SLA / delay math (IST): 10:30–18:30 → 8h per business day. */
export const WORK_HOURS_PER_DAY = 8
const WORK_TZ = 'Asia/Kolkata'
const WORK_START_H = 10
const WORK_START_M = 30
const WORK_END_H = 18
const WORK_END_M = 30

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

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function istParts(d: Date): { y: number; mo: number; day: number; h: number; mi: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: WORK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const map: Record<string, string> = {}
  for (const p of fmt.formatToParts(d)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  return {
    y: Number(map.year),
    mo: Number(map.month),
    day: Number(map.day),
    h: Number(map.hour),
    mi: Number(map.minute),
  }
}

function toDateKeyIST(d: Date): string {
  const { y, mo, day } = istParts(d)
  return `${y}-${pad2(mo)}-${pad2(day)}`
}

function dateAtIST(y: number, mo: number, day: number, h: number, mi: number): Date {
  return new Date(`${y}-${pad2(mo)}-${pad2(day)}T${pad2(h)}:${pad2(mi)}:00+05:30`)
}

function workWindowForKey(key: string): { start: Date; end: Date } {
  const [y, mo, day] = key.split('-').map(Number)
  return {
    start: dateAtIST(y, mo, day, WORK_START_H, WORK_START_M),
    end: dateAtIST(y, mo, day, WORK_END_H, WORK_END_M),
  }
}

function istWeekday(d: Date): number {
  return new Date(`${toDateKeyIST(d)}T12:00:00+05:30`).getUTCDay()
}

function isBusinessDayIST(d: Date, holidays: Set<string>): boolean {
  const wd = istWeekday(d)
  if (wd === 0 || wd === 6) return false
  return !holidays.has(toDateKeyIST(d))
}

function nextBusinessDayKey(fromKey: string, holidays: Set<string>): string {
  const [y, mo, day] = fromKey.split('-').map(Number)
  let cur = dateAtIST(y, mo, day, 12, 0)
  for (let i = 0; i < 400; i++) {
    cur = addDays(cur, 1)
    const key = toDateKeyIST(cur)
    if (isBusinessDayIST(cur, holidays)) return key
  }
  return fromKey
}

function advanceToWorkTime(cursor: Date, holidays: Set<string>): Date {
  let cur = new Date(cursor)
  for (let guard = 0; guard < 400; guard++) {
    if (!isBusinessDayIST(cur, holidays)) {
      const key = nextBusinessDayKey(toDateKeyIST(cur), holidays)
      return workWindowForKey(key).start
    }
    const window = workWindowForKey(toDateKeyIST(cur))
    if (cur < window.start) return window.start
    if (cur >= window.end) {
      const key = nextBusinessDayKey(toDateKeyIST(cur), holidays)
      cur = workWindowForKey(key).start
      continue
    }
    return cur
  }
  return cur
}

export function addBusinessHours(start: Date, hours: number, holidays: string[] = []): Date {
  const holidaySet = new Set(holidays)
  let cur = advanceToWorkTime(new Date(start), holidaySet)
  let remaining = hours

  while (remaining > 0) {
    if (!isBusinessDayIST(cur, holidaySet)) {
      cur = advanceToWorkTime(cur, holidaySet)
      continue
    }
    const window = workWindowForKey(toDateKeyIST(cur))
    const availableMin = Math.max(0, differenceInMinutes(window.end, cur))
    const availableHours = availableMin / 60
    if (remaining <= availableHours) {
      return addMinutes(cur, Math.round(remaining * 60))
    }
    remaining -= availableHours
    cur = advanceToWorkTime(addMinutes(window.end, 1), holidaySet)
  }

  return cur
}

export function businessHoursBetween(start: Date, end: Date, holidays: string[] = []): number {
  const holidaySet = new Set(holidays)
  if (end <= start) return 0

  let total = 0
  let cur = advanceToWorkTime(new Date(start), holidaySet)

  while (cur < end) {
    if (!isBusinessDayIST(cur, holidaySet)) {
      cur = advanceToWorkTime(cur, holidaySet)
      continue
    }
    const window = workWindowForKey(toDateKeyIST(cur))
    const segStart = cur
    const segEnd = end < window.end ? end : window.end
    if (segStart >= segEnd) {
      cur = advanceToWorkTime(addMinutes(window.end, 1), holidaySet)
      continue
    }
    total += differenceInMinutes(segEnd, segStart) / 60
    cur = segEnd >= window.end ? advanceToWorkTime(addMinutes(window.end, 1), holidaySet) : end
  }

  return total
}

type ExcludePeriod = { start: Date; end: Date }

/** Business hours between two dates, excluding hold/pause periods */
export function businessHoursBetweenExcluding(
  start: Date,
  end: Date,
  holidays: string[] = [],
  exclude: ExcludePeriod[] = []
): number {
  if (end <= start) return 0
  if (!exclude.length) return businessHoursBetween(start, end, holidays)

  const sorted = [...exclude]
    .filter(p => p.end > p.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  let total = 0
  let cursor = new Date(start)

  while (cursor < end) {
    let segmentEnd = end
    for (const p of sorted) {
      if (p.end <= cursor) continue
      if (p.start >= end) break
      if (p.start > cursor && p.start < segmentEnd) {
        segmentEnd = p.start
        break
      }
      if (p.start <= cursor && p.end > cursor) {
        cursor = p.end
        segmentEnd = cursor
        break
      }
    }
    if (cursor >= end) break
    if (segmentEnd > cursor) {
      total += businessHoursBetween(cursor, segmentEnd, holidays)
      cursor = segmentEnd
    } else {
      cursor = addMinutes(cursor, 1)
    }
  }

  return total
}

export function addBusinessDays(start: Date, days: number, holidays: string[] = []): Date {
  const holidaySet = new Set(holidays)
  let cur = startOfDay(start)
  let added = 0
  while (added < days) {
    cur = addDays(cur, 1)
    if (isBusinessDay(cur, holidaySet)) added++
  }
  return cur
}

export function minReleaseDateFromRequest(requestDate: Date, workingDays = 3, holidays: string[] = []): string {
  return format(addBusinessDays(requestDate, workingDays, holidays), 'yyyy-MM-dd')
}

type HoldWindow = { started_at: string; ended_at?: string | null }

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

/** Like businessDaysLate but subtracts business days spent on hold after the target date. */
export function businessDaysLateExcluding(
  targetDateStr: string,
  holidays: string[] = [],
  holdPeriods: HoldWindow[] = [],
): number {
  const baseLate = businessDaysLate(targetDateStr, holidays)
  if (!baseLate || !holdPeriods.length) return baseLate

  const target = startOfDay(parseISO(targetDateStr))
  if (!isValid(target)) return baseLate

  const holidaySet = new Set(holidays)
  const today = startOfDay(new Date())
  let holdDays = 0

  for (const period of holdPeriods) {
    const start = startOfDay(parseISO(period.started_at))
    const end = startOfDay(period.ended_at ? parseISO(period.ended_at) : new Date())
    if (!isValid(start) || !isValid(end)) continue

    let cur = start > target ? start : addDays(target, 1)
    while (cur <= end && cur <= today) {
      if (isBusinessDay(cur, holidaySet)) holdDays++
      cur = addDays(cur, 1)
    }
  }

  return Math.max(0, baseLate - holdDays)
}

export function splitBusinessHours(totalHours: number): { days: number; hours: number } {
  return { days: Math.floor(totalHours / WORK_HOURS_PER_DAY), hours: totalHours % WORK_HOURS_PER_DAY }
}

function formatHoursOneDecimal(hours: number): string {
  const rounded = Math.round(hours * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${text}h`
}

export function formatBusinessWaiting(hours: number): string {
  if (hours < 1) return '< 1h'
  if (hours < WORK_HOURS_PER_DAY) return formatHoursOneDecimal(hours)
  const days = Math.floor(hours / WORK_HOURS_PER_DAY)
  const rem = Math.round((hours % WORK_HOURS_PER_DAY) * 10) / 10
  if (rem === 0) return `${days}d`
  return `${days}d ${formatHoursOneDecimal(rem)}`
}
