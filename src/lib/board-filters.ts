export function parseCsvFilter(param: string | null | undefined): string[] {
  if (!param?.trim()) return []
  return [...new Set(param.split(',').map(v => v.trim()).filter(Boolean))]
}

export function formatCsvFilter(values: string[]): string {
  return values.join(',')
}

/** @deprecated use parseCsvFilter */
export const parseIpFilter = parseCsvFilter

/** @deprecated use formatCsvFilter */
export const formatIpFilter = formatCsvFilter

export function toggleCsvFilterValue(current: string[], value: string): string[] {
  if (current.includes(value)) return current.filter(item => item !== value)
  return [...current, value]
}
