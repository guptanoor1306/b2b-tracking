'use client'

import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

type Props = {
  ips: string[]
  languages?: string[]
  matchCount?: number
  embedded?: boolean
}

export function BoardMetaFilter({ ips, languages = [], matchCount, embedded = false }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeIp = searchParams.get('ip') ?? ''
  const activeLanguage = searchParams.get('language') ?? ''

  const currentValue = activeLanguage ? `lang:${activeLanguage}` : activeIp ? `ip:${activeIp}` : ''

  const setFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('ip')
    params.delete('language')
    if (value.startsWith('lang:')) params.set('language', value.slice(5))
    else if (value.startsWith('ip:')) params.set('ip', value.slice(3))
    router.push(`/board?${params.toString()}`)
  }

  const hasOptions = ips.length > 0 || languages.length > 0
  if (!hasOptions) return null

  const activeLabel = activeLanguage || activeIp || 'All projects'

  const content = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0">
        Filter
      </span>
      <div className="relative min-w-[160px] max-w-[240px]">
        <select
          value={currentValue}
          onChange={e => setFilter(e.target.value)}
          className={cn(
            'h-8 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-8',
            'text-xs font-medium text-zinc-700',
            'hover:border-violet-200 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100',
            currentValue && 'border-violet-200 text-violet-800',
          )}
        >
          <option value="">All projects</option>
          {languages.length > 0 && (
            <optgroup label="Language">
              {languages.map(lang => (
                <option key={lang} value={`lang:${lang}`}>{lang}</option>
              ))}
            </optgroup>
          )}
          {ips.length > 0 && (
            <optgroup label="IP">
              {ips.map(ip => (
                <option key={ip} value={`ip:${ip}`}>{ip}</option>
              ))}
            </optgroup>
          )}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
      </div>
      {currentValue && (
        <button
          type="button"
          onClick={() => setFilter('')}
          className="text-[11px] font-medium text-zinc-500 hover:text-violet-700"
        >
          Clear
        </button>
      )}
    </div>
  )

  if (embedded) {
    return (
      <div className="min-w-0 flex-1 space-y-2">
        {content}
        {currentValue && (
          <p className="text-xs text-zinc-500">
            Showing {matchCount ?? 0} project{(matchCount ?? 0) !== 1 ? 's' : ''}
            {activeLanguage && <> · <span className="font-medium text-zinc-700">{activeLanguage}</span></>}
            {activeIp && <> · <span className="font-medium text-zinc-700">{activeIp}</span></>}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm space-y-2">
      {content}
      {currentValue && (
        <p className="text-xs text-zinc-500">
          Filtered: <span className="font-medium text-zinc-700">{activeLabel}</span>
        </p>
      )}
    </div>
  )
}
