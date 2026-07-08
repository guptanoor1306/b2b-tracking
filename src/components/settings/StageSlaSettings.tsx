'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StageSlaRow } from '@/lib/stage-sla'
import { SettingsActivityLog } from '@/lib/types'
import { updateStageSla } from '@/lib/actions/stage-sla'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatDate, cn } from '@/lib/utils'
import { formatSlaDuration } from '@/lib/timelines'
import { SettingsPanel, SettingsCard } from '@/components/settings/SettingsLayout'
import { isZerodhaChannelDbName, ZERODHA_LEVEL_LABELS } from '@/lib/zerodha-sla'
import { History, Pencil, X, Check } from 'lucide-react'

type Props = {
  rows: StageSlaRow[]
  activity: SettingsActivityLog[]
  channelDbName: string
}

type LevelKey = 'level_0_hours' | 'level_1_hours' | 'level_2_hours' | 'level_3_hours' | 'level_4_hours'

const ZERODHA_LEVEL_COLUMNS: { key: LevelKey; label: string }[] = [
  { key: 'level_0_hours', label: 'L0 · Gif' },
  { key: 'level_1_hours', label: 'L1 · Reel' },
  { key: 'level_2_hours', label: 'L2 · 3-4 mins' },
  { key: 'level_3_hours', label: 'L3 · 6-7 mins' },
  { key: 'level_4_hours', label: 'L4 · 14-15 mins' },
]

const VARSITY_LEVEL_COLUMNS: { key: LevelKey; label: string }[] = [
  { key: 'level_1_hours', label: 'L1' },
  { key: 'level_2_hours', label: 'L2' },
  { key: 'level_3_hours', label: 'L3' },
]

function levelCell(row: StageSlaRow, key: LevelKey) {
  const value = row[key]
  return value != null ? formatSlaDuration(value) : '—'
}

export function StageSlaSettings({ rows, activity, channelDbName }: Props) {
  const router = useRouter()
  const isZerodha = isZerodhaChannelDbName(channelDbName)
  const levelColumns = isZerodha ? ZERODHA_LEVEL_COLUMNS : VARSITY_LEVEL_COLUMNS
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showLog, setShowLog] = useState(false)

  const startEdit = (row: StageSlaRow) => {
    setEditing(row.stage_name)
    const next: Record<string, string> = { duration_hours: String(row.duration_hours) }
    for (const col of levelColumns) {
      next[col.key] = row[col.key] != null ? String(row[col.key]) : ''
    }
    setForm(next)
  }

  const save = async (stageName: string) => {
    setLoading(true)
    setError('')
    const payload: Parameters<typeof updateStageSla>[1] = {
      duration_hours: Number(form.duration_hours),
    }
    for (const col of levelColumns) {
      payload[col.key] = form[col.key] ? Number(form[col.key]) : null
    }
    const result = await updateStageSla(stageName, payload)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setEditing(null)
    router.refresh()
  }

  const description = isZerodha
    ? 'Zerodha Online English SLAs. Steps 1–4 and 8–11 are shared across levels; steps 5–7 vary by level (Graphics & Animation run in parallel from step 5). Hindi projects use end-to-end totals only — Level 2: 1 day, Level 3: 1.5 days.'
    : 'Set SLA hours per pipeline stage. Changes apply to active in-pipeline projects and all new projects. Delivered projects keep their original target dates.'

  return (
    <SettingsPanel
      title="Stage timelines"
      description={description}
      action={
        activity.length > 0 ? (
          <Button size="sm" variant="secondary" onClick={() => setShowLog(v => !v)}>
            <History size={14} />
            {showLog ? 'Hide log' : 'Change log'}
          </Button>
        ) : undefined
      }
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isZerodha && (
        <SettingsCard padding="sm" className="border-blue-100 bg-blue-50/50">
          <p className="text-sm text-blue-900">
            <span className="font-medium">Level key:</span>{' '}
            {Object.entries(ZERODHA_LEVEL_LABELS).map(([level, label]) => `${level} ${label}`).join(' · ')}
          </p>
        </SettingsCard>
      )}

      {showLog && activity.length > 0 && (
        <SettingsCard padding="sm" className="bg-zinc-50/50">
          <p className="mb-3 text-sm font-medium text-zinc-800">Recent timeline changes</p>
          <ul className="max-h-52 space-y-2 overflow-y-auto">
            {activity.map(a => (
              <li key={a.id} className="rounded-lg border border-zinc-100 bg-white px-3 py-2.5 text-sm">
                <span className="font-medium text-zinc-900">{a.updater?.name ?? 'Channel Admin'}</span>
                <span className="text-zinc-500"> updated </span>
                <span className="font-medium text-zinc-800">{a.field_changed}</span>
                <span className="text-zinc-500">: {a.old_value ?? '—'} → {a.new_value ?? '—'}</span>
                <p className="mt-0.5 text-xs text-zinc-400">{formatDate(a.updated_at, 'dd MMM yyyy, HH:mm')}</p>
              </li>
            ))}
          </ul>
        </SettingsCard>
      )}

      <SettingsCard padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={cn('w-full text-sm', isZerodha ? 'min-w-[980px]' : 'min-w-[680px]')}>
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Stage</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Owner</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Default</th>
                {levelColumns.map(col => (
                  <th key={col.key} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{col.label}</th>
                ))}
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map(row => {
                const isEdit = editing === row.stage_name
                return (
                  <tr key={row.id} className={cn('transition-colors', isEdit ? 'bg-violet-50/40' : 'hover:bg-zinc-50/60')}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">{row.stage_name}</span>
                      {row.parallel_group && (
                        <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          Parallel
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{row.role_owner}</td>
                    <td className="px-4 py-3">
                      {isEdit ? (
                        <Input value={form.duration_hours} onChange={e => setForm(f => ({ ...f, duration_hours: e.target.value }))} className="h-8 w-20 text-sm" />
                      ) : (
                        <span className="tabular-nums text-zinc-800">{formatSlaDuration(row.duration_hours)}</span>
                      )}
                    </td>
                    {levelColumns.map(col => (
                      <td key={col.key} className="px-4 py-3">
                        {isEdit ? (
                          <Input
                            value={form[col.key] ?? ''}
                            onChange={e => setForm(f => ({ ...f, [col.key]: e.target.value }))}
                            className="h-8 w-20 text-sm"
                            placeholder="—"
                          />
                        ) : (
                          <span className="tabular-nums text-zinc-500">{levelCell(row, col.key)}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      {isEdit ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)} aria-label="Cancel">
                            <X size={14} />
                          </Button>
                          <Button size="sm" loading={loading} onClick={() => save(row.stage_name)} aria-label="Save">
                            <Check size={14} />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
                          <Pencil size={13} />
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SettingsCard>
    </SettingsPanel>
  )
}
