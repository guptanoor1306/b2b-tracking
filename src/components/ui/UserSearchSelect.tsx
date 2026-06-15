'use client'

import { useState, useRef, useEffect } from 'react'
import { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ChevronDown, Search } from 'lucide-react'

type Props = {
  label?: string
  users: Profile[]
  value: string
  onChange: (userId: string) => void
  placeholder?: string
  allowClear?: boolean
}

export function UserSearchSelect({
  label, users, value, onChange, placeholder = 'Select assignee', allowClear = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = users.find(u => u.id === value)
  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-left text-zinc-200 hover:border-white/20 transition-colors"
      >
        <span className={cn(!selected && 'text-zinc-500')}>
          {selected?.name ?? placeholder}
        </span>
        <ChevronDown size={14} className="text-zinc-500 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#18181b] shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
            <Search size={14} className="text-zinc-500 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search names…"
              className="flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {allowClear && (
              <li>
                <button
                  type="button"
                  onClick={() => { onChange(''); setOpen(false); setQuery('') }}
                  className="w-full px-3 py-2 text-left text-sm text-zinc-500 hover:bg-white/5"
                >
                  No assignee
                </button>
              </li>
            )}
            {filtered.map(u => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => { onChange(u.id); setOpen(false); setQuery('') }}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-white/5',
                    u.id === value ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-300'
                  )}
                >
                  {u.name}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-zinc-600">No users found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
