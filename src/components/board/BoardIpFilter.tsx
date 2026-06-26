'use client'

import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { getIpAccent, getIpPillClass } from '@/lib/design/theme-v2'

type Props = {
  ips: string[]
  matchCount?: number
}

export function BoardIpFilter({ ips, matchCount }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get('ip') ?? ''

  const setIp = (ip: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!ip) params.delete('ip')
    else params.set('ip', ip)
    router.push(`/board?${params.toString()}`)
  }

  if (ips.length === 0) return null

  return (
    <div className="mb-4 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mr-1">
          Filter by IP
        </span>
        <button
          type="button"
          onClick={() => setIp('')}
          className={cn(
            'h-8 px-3 rounded-full text-xs font-medium border transition-colors',
            !active
              ? 'bg-violet-600 border-violet-600 text-white'
              : 'border-zinc-200 text-zinc-600 hover:border-violet-200 hover:text-violet-700 bg-white'
          )}
        >
          All
        </button>
        {ips.map(ip => {
          const accent = getIpAccent(ip)
          const isActive = active === ip
          return (
            <button
              key={ip}
              type="button"
              onClick={() => setIp(ip)}
              title={ip}
              className={cn(
                'h-8 max-w-[160px] truncate rounded-full border px-3 text-xs font-medium transition-all inline-flex items-center gap-1.5',
                getIpPillClass(ip, isActive)
              )}
            >
              <span className={cn('h-2 w-2 shrink-0 rounded-full', accent.bg)} />
              <span className="truncate">{ip}</span>
            </button>
          )
        })}
      </div>
      {active && (
        <p className="text-xs text-zinc-500">
          Showing {matchCount ?? 0} project{(matchCount ?? 0) !== 1 ? 's' : ''} in{' '}
          <span className="font-medium text-zinc-700">{active}</span>
        </p>
      )}
    </div>
  )
}
