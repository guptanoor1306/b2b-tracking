'use client'

import { useState } from 'react'
import { Project } from '@/lib/types'
import { CompactProjectRow } from './CompactProjectRow'
import {
  ChevronDown, Inbox, Package, CheckCircle2, GitBranch, PauseCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PREVIEW_LIMIT = 5

const ICONS = {
  package: Package,
  delivered: CheckCircle2,
  pipeline: GitBranch,
  hold: PauseCircle,
} as const

type IconName = keyof typeof ICONS

type Props = {
  title: string
  count: number
  projects: Project[]
  iconName: IconName
  iconColor: string
  emptyMessage: string
}

export function CollapsibleProjectSection({
  title, count, projects, iconName, iconColor, emptyMessage,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = projects.length > PREVIEW_LIMIT
  const visible = expanded ? projects : projects.slice(0, PREVIEW_LIMIT)
  const Icon = ICONS[iconName]

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => hasMore && setExpanded(e => !e)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-white/[0.06]',
          hasMore && 'hover:bg-white/[0.02] cursor-pointer',
          !hasMore && 'cursor-default'
        )}
      >
        <div className={`p-1.5 rounded-md shrink-0 ${iconColor}`}>
          <Icon size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-zinc-200">{title}</h2>
          <p className="text-[11px] text-zinc-600">{count} project{count !== 1 ? 's' : ''}</p>
        </div>
        {hasMore && (
          <ChevronDown
            size={16}
            className={cn('text-zinc-600 shrink-0 transition-transform', expanded && 'rotate-180')}
          />
        )}
      </button>

      <div className="px-3 py-3">
        {projects.length === 0 ? (
          <div className="py-6 text-center">
            <Inbox size={20} className="mx-auto text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-500">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              {visible.map(p => <CompactProjectRow key={p.id} project={p} />)}
            </div>
            {hasMore && !expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full mt-2 py-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Show {projects.length - PREVIEW_LIMIT} more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
