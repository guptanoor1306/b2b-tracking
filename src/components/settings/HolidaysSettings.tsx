'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OrgHoliday } from '@/lib/data/holidays'
import { addHoliday, removeHoliday } from '@/lib/actions/holidays'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

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
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Weekends are excluded automatically. Add dates here to exclude from SLA timelines.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Input label="Name (optional)" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diwali" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button size="sm" loading={loading} onClick={handleAdd}>Add holiday</Button>

      {initial.length === 0 ? (
        <p className="text-xs text-zinc-500">No custom holidays configured.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
          {initial.map(h => (
            <li key={h.id} className="flex items-center justify-between px-3 py-2.5 text-sm bg-white">
              <div>
                <span className="text-zinc-800 font-medium">{formatDate(h.holiday_date)}</span>
                {h.name && <span className="text-zinc-500 ml-2">{h.name}</span>}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(h.id)}
                className="text-zinc-400 hover:text-red-600 p-1"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
