'use client'

import { CONTENT_TYPES, STAGES_INTERNAL } from '@/lib/constants'
import { Agency, Profile } from '@/lib/types'

type Props = {
  filters: Record<string, string>
  onChange: (key: string, value: string) => void
  agencies?: Agency[]
  owners?: Profile[]
  editors?: string[]
}

export function ProjectFilters({ filters, onChange, agencies = [], owners = [], editors = [] }: Props) {
  const selectClass =
    'rounded-md border border-gray-300 px-2 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

  return (
    <div className="flex flex-wrap gap-2">
      <select className={selectClass} value={filters.content_type ?? ''} onChange={e => onChange('content_type', e.target.value)}>
        <option value="">All Types</option>
        {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      <select className={selectClass} value={filters.current_stage ?? ''} onChange={e => onChange('current_stage', e.target.value)}>
        <option value="">All Stages</option>
        {STAGES_INTERNAL.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <select className={selectClass} value={filters.status_health ?? ''} onChange={e => onChange('status_health', e.target.value)}>
        <option value="">All Health</option>
        {['On track', 'At risk', 'Delayed', 'On hold', 'Delivered'].map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <select className={selectClass} value={filters.editor ?? ''} onChange={e => onChange('editor', e.target.value)}>
        <option value="">All Editors</option>
        {editors.map(e => <option key={e} value={e}>{e}</option>)}
      </select>

      <select className={selectClass} value={filters.agency ?? ''} onChange={e => onChange('agency', e.target.value)}>
        <option value="">All Agencies</option>
        {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      <select className={selectClass} value={filters.owner ?? ''} onChange={e => onChange('owner', e.target.value)}>
        <option value="">All Owners</option>
        {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>

      <input
        type="month"
        className={selectClass}
        value={filters.month ?? ''}
        onChange={e => onChange('month', e.target.value)}
      />
    </div>
  )
}
