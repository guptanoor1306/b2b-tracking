'use client'

import { useState } from 'react'
import { Project } from '@/lib/types'
import { CompactProjectRow } from './CompactProjectRow'
import { AssigneeContext, DisplayProfile } from '@/lib/projects/display-assignee'
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
  variant?: 'dark' | 'light'
  assigneeContext?: AssigneeContext
  holdStarters?: Record<string, DisplayProfile>
}

export function CollapsibleProjectSection({
  title, count, projects, iconName, iconColor, emptyMessage, variant = 'dark',
  assigneeContext = 'stage', holdStarters,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = projects.length > PREVIEW_LIMIT
  const visible = expanded ? projects : projects.slice(0, PREVIEW_LIMIT)
  const Icon = ICONS[iconName]
  const light = variant === 'light'

  return (
    <div className={cn(
      'overflow-hidden rounded-2xl border shadow-sm',
      light ? 'border-zinc-200/80 bg-white' : 'panel'
    )}>
      <button
        type="button"
        onClick={() => hasMore && setExpanded(e => !e)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b',
          light ? 'border-zinc-100 hover:bg-zinc-50/50' : 'border-white/[0.06] hover:bg-white/[0.02]',
          hasMore && 'cursor-pointer',
          !hasMore && 'cursor-default'
        )}
      >
        <div className={cn('p-2 rounded-xl shrink-0', iconColor)}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={cn('text-sm font-bold', light ? 'text-zinc-900' : 'text-zinc-200')}>{title}</h2>
          <p className={cn('text-xs mt-0.5', light ? 'text-zinc-500' : 'text-zinc-600')}>
            {count} project{count !== 1 ? 's' : ''}
          </p>
        </div>
        {hasMore && (
          <ChevronDown
            size={16}
            className={cn('shrink-0 transition-transform', light ? 'text-zinc-400' : 'text-zinc-600', expanded && 'rotate-180')}
          />
        )}
      </button>

      <div className="px-3 py-3">
        {projects.length === 0 ? (
          <div className="py-8 text-center">
            <Inbox size={22} className={cn('mx-auto mb-2', light ? 'text-zinc-300' : 'text-zinc-600')} />
            <p className={cn('text-sm', light ? 'text-zinc-500' : 'text-zinc-500')}>{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-1">
              {visible.map(p => (
                <CompactProjectRow
                  key={p.id}
                  project={p}
                  variant={light ? 'light' : 'dark'}
                  assigneeContext={assigneeContext}
                  holdStarter={holdStarters?.[p.id]}
                />
              ))}
            </div>
            {hasMore && !expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className={cn(
                  'w-full mt-2 py-2 text-xs font-medium transition-colors',
                  light ? 'text-violet-600 hover:text-violet-700' : 'text-indigo-400 hover:text-indigo-300'
                )}
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
