'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCsvFilter, parseCsvFilter, toggleCsvFilterValue } from '@/lib/board-filters'
import { getIpAccent } from '@/lib/design/theme-v2'

type Props = {
  ips: string[]
  languages?: string[]
  types: string[]
}

type FilterGroupProps = {
  title: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  renderOption?: (value: string) => ReactNode
}

function FilterGroup({ title, options, selected, onToggle, renderOption }: FilterGroupProps) {
  if (!options.length) return null

  return (
    <div className="border-b border-zinc-100 px-3 py-2.5 last:border-0">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{title}</p>
      <div className="space-y-1">
        {options.map(option => {
          const checked = selected.includes(option)
          return (
            <label
              key={option}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                checked ? 'bg-violet-50 text-violet-900' : 'text-zinc-700 hover:bg-zinc-50',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(option)}
                className="h-3.5 w-3.5 rounded border-zinc-300 text-violet-600 focus:ring-violet-500/30"
              />
              <span className="min-w-0 truncate">{renderOption ? renderOption(option) : option}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export function BoardProjectFilters({ ips, languages = [], types }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const activeIps = parseCsvFilter(searchParams.get('ip'))
  const activeLanguages = parseCsvFilter(searchParams.get('language'))
  const activeTypes = parseCsvFilter(searchParams.get('content_type'))
  const activeCount = activeIps.length + activeLanguages.length + activeTypes.length

  const hasOptions = ips.length > 0 || languages.length > 0 || types.length > 0
  if (!hasOptions) return null

  const pushFilters = (next: { ip?: string[]; language?: string[]; content_type?: string[] }) => {
    const params = new URLSearchParams(searchParams.toString())
    const apply = (key: string, values: string[] | undefined) => {
      if (values === undefined) return
      if (!values.length) params.delete(key)
      else params.set(key, formatCsvFilter(values))
    }
    apply('ip', next.ip)
    apply('language', next.language)
    apply('content_type', next.content_type)
    router.push(`/board?${params.toString()}`)
  }

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('ip')
    params.delete('language')
    params.delete('content_type')
    router.push(`/board?${params.toString()}`)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const summaryLabel = activeCount === 0
    ? 'All projects'
    : `${activeCount} filter${activeCount !== 1 ? 's' : ''} active`

  return (
    <div ref={rootRef} className="relative min-w-[180px]">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className={cn(
          'flex h-8 w-full items-center justify-between gap-2 rounded-lg border px-3 text-xs font-medium transition-colors',
          activeCount > 0
            ? 'border-violet-200 bg-violet-50 text-violet-800'
            : 'border-zinc-200 bg-white text-zinc-700 hover:border-violet-200',
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Filter size={13} className="shrink-0" />
          <span className="truncate">{summaryLabel}</span>
        </span>
        <ChevronDown size={14} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[min(100vw-2rem,280px)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
            <p className="text-xs font-semibold text-zinc-900">Filter projects</p>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-medium text-zinc-500 hover:text-violet-700"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-[min(60vh,360px)] overflow-y-auto">
            <FilterGroup
              title="IP"
              options={ips}
              selected={activeIps}
              onToggle={value => pushFilters({ ip: toggleCsvFilterValue(activeIps, value) })}
              renderOption={ip => (
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', getIpAccent(ip).bg)} />
                  {ip}
                </span>
              )}
            />
            <FilterGroup
              title="Language"
              options={languages}
              selected={activeLanguages}
              onToggle={value => pushFilters({ language: toggleCsvFilterValue(activeLanguages, value) })}
            />
            <FilterGroup
              title="Type of project"
              options={types}
              selected={activeTypes}
              onToggle={value => pushFilters({ content_type: toggleCsvFilterValue(activeTypes, value) })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
