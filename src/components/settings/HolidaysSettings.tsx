'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrgHoliday } from '@/lib/data/holidays'
import { addHoliday, removeHoliday } from '@/lib/actions/holidays'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { CalendarDays, Trash2 } from 'lucide-react'
import { SettingsPanel, SettingsCard, SettingsEmptyState } from '@/components/settings/SettingsLayout'

type Props = { holidays: OrgHoliday[] }

export function HolidaysSettings({ holidays: initial }: Props) {
  const router = useRouter()
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!date) return
    setLoading(true)
    setError('')
    const result = await addHoliday(date, name)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setDate('')
    setName('')
    router.refresh()
  }

  const handleRemove = async (id: string) => {
    await removeHoliday(id)
    router.refresh()
  }

  return (
    <SettingsPanel
      title="Business holidays"
      description="Weekends are excluded automatically. Add company holidays here so they are skipped in SLA and timeline calculations."
    >
      <SettingsCard>
        <p className="mb-4 text-sm font-medium text-zinc-800">Add a holiday</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Input
            label="Name (optional)"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Diwali, Republic Day"
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end">
          <Button size="sm" loading={loading} onClick={handleAdd} disabled={!date}>
            Add holiday
          </Button>
        </div>
      </SettingsCard>

      {initial.length === 0 ? (
        <SettingsEmptyState
          icon={CalendarDays}
          title="No custom holidays yet"
          description="Add dates when your team is off so project timelines stay accurate."
        />
      ) : (
        <div>
          <p className="mb-3 text-sm font-medium text-zinc-800">
            {initial.length} holiday{initial.length !== 1 ? 's' : ''} configured
          </p>
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {initial.map(h => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50/80">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-zinc-900">{formatDate(h.holiday_date)}</span>
                  {h.name && (
                    <span className="ml-2 text-sm text-zinc-500">{h.name}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(h.id)}
                  className="shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Remove holiday"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SettingsPanel>
  )
}
