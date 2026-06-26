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
import { History, Pencil, X, Check } from 'lucide-react'

type Props = {
  rows: StageSlaRow[]
  activity: SettingsActivityLog[]
}

export function StageSlaSettings({ rows, activity }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showLog, setShowLog] = useState(false)

  const startEdit = (row: StageSlaRow) => {
    setEditing(row.stage_name)
    setForm({
      duration_hours: String(row.duration_hours),
      level_1_hours: row.level_1_hours != null ? String(row.level_1_hours) : '',
      level_2_hours: row.level_2_hours != null ? String(row.level_2_hours) : '',
      level_3_hours: row.level_3_hours != null ? String(row.level_3_hours) : '',
    })
  }

  const save = async (stageName: string) => {
    setLoading(true)
    setError('')
    const result = await updateStageSla(stageName, {
      duration_hours: Number(form.duration_hours),
      level_1_hours: form.level_1_hours ? Number(form.level_1_hours) : null,
      level_2_hours: form.level_2_hours ? Number(form.level_2_hours) : null,
      level_3_hours: form.level_3_hours ? Number(form.level_3_hours) : null,
    })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setEditing(null)
    router.refresh()
  }

  return (
    <SettingsPanel
      title="Stage timelines"
      description="Set SLA hours per pipeline stage. Changes apply to active in-pipeline projects and all new projects. Delivered projects keep their original target dates."
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

      {showLog && activity.length > 0 && (
        <SettingsCard padding="sm" className="bg-zinc-50/50">
          <p className="mb-3 text-sm font-medium text-zinc-800">Recent timeline changes</p>
          <ul className="max-h-52 space-y-2 overflow-y-auto">
            {activity.map(a => (
              <li key={a.id} className="rounded-lg border border-zinc-100 bg-white px-3 py-2.5 text-sm">
                <span className="font-medium text-zinc-900">{a.updater?.name ?? 'Admin'}</span>
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
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Stage</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Owner</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Default</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">L1</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">L2</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">L3</th>
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
                    <td className="px-4 py-3">
                      {isEdit && row.level_1_hours != null ? (
                        <Input value={form.level_1_hours} onChange={e => setForm(f => ({ ...f, level_1_hours: e.target.value }))} className="h-8 w-20 text-sm" />
                      ) : (
                        <span className="tabular-nums text-zinc-500">{row.level_1_hours != null ? formatSlaDuration(row.level_1_hours) : '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEdit && row.level_2_hours != null ? (
                        <Input value={form.level_2_hours} onChange={e => setForm(f => ({ ...f, level_2_hours: e.target.value }))} className="h-8 w-20 text-sm" />
                      ) : (
                        <span className="tabular-nums text-zinc-500">{row.level_2_hours != null ? formatSlaDuration(row.level_2_hours) : '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEdit && row.level_3_hours != null ? (
                        <Input value={form.level_3_hours} onChange={e => setForm(f => ({ ...f, level_3_hours: e.target.value }))} className="h-8 w-20 text-sm" />
                      ) : (
                        <span className="tabular-nums text-zinc-500">{row.level_3_hours != null ? formatSlaDuration(row.level_3_hours) : '—'}</span>
                      )}
                    </td>
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
