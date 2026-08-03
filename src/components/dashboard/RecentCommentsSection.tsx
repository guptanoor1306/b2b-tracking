'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, CornerDownRight, ChevronDown, ChevronUp, X } from 'lucide-react'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { dismissCommentFeedItem } from '@/lib/actions/comments'
import type { RecentCommentFeedItem } from '@/lib/data/comments'
import { cn } from '@/lib/utils'

const PREVIEW_LIMIT = 5

type Props = {
  items: RecentCommentFeedItem[]
  hours?: number
}

function CommentRow({
  item,
  onDismiss,
  dismissing,
}: {
  item: RecentCommentFeedItem
  onDismiss: (id: string) => void
  dismissing: boolean
}) {
  return (
    <div className="group relative rounded-lg border border-zinc-100 bg-zinc-50/40 transition-colors hover:border-violet-100 hover:bg-violet-50/30">
      <Link
        href={`/projects/${item.project_id}`}
        className="block px-3 py-2.5 pr-9"
      >
        <div className="flex gap-2.5">
          {item.author_id ? (
            <AssigneeAvatar name={item.author_name} id={item.author_id} size="sm" theme="light" />
          ) : (
            <div className="h-7 w-7 shrink-0 rounded-full bg-zinc-200" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="text-xs font-semibold text-zinc-900">{item.author_name}</span>
              <span className="text-zinc-300">·</span>
              <span className="max-w-[120px] truncate text-xs font-medium text-violet-700">
                {item.project_title}
              </span>
              {item.is_reply && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-zinc-400">
                  <CornerDownRight size={10} /> reply
                </span>
              )}
              <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug text-zinc-600 line-clamp-2 group-hover:text-zinc-800">
              {item.comment}
            </p>
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        disabled={dismissing}
        className={cn(
          'absolute right-2 top-2 rounded-md p-1 text-zinc-400 transition-colors',
          'opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100',
          'hover:bg-zinc-200/80 hover:text-zinc-700',
          dismissing && 'opacity-50 cursor-wait',
        )}
        aria-label="Dismiss notification"
        title="Dismiss from feed"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function RecentCommentsSection({ items, hours = 24 }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  const activeItems = items.filter(i => !hiddenIds.has(i.id))
  const hasMore = activeItems.length > PREVIEW_LIMIT
  const visible = expanded ? activeItems : activeItems.slice(0, PREVIEW_LIMIT)

  const handleDismiss = async (commentId: string) => {
    setDismissingId(commentId)
    setHiddenIds(prev => new Set(prev).add(commentId))
    const result = await dismissCommentFeedItem(commentId)
    setDismissingId(null)
    if (result.error) {
      setHiddenIds(prev => {
        const next = new Set(prev)
        next.delete(commentId)
        return next
      })
    }
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare size={16} className="shrink-0 text-violet-600" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900">Recent comments</h2>
              {activeItems.length > 0 && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                  {activeItems.length}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500">Last {hours} hours · hover to dismiss</p>
          </div>
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(e => !e)}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 hover:text-violet-700 transition-colors"
            aria-expanded={expanded}
            aria-label={expanded ? 'Show fewer comments' : 'Show all comments'}
          >
            {expanded ? (
              <>
                <ChevronUp size={14} />
                Less
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                All {activeItems.length}
              </>
            )}
          </button>
        )}
      </div>

      {activeItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          {items.length > 0 && hiddenIds.size > 0
            ? 'All recent comments dismissed.'
            : `No comments in the last ${hours} hours.`}
        </p>
      ) : (
        <div className={cn(
          'space-y-2',
          expanded && hasMore && 'max-h-[min(420px,55vh)] overflow-y-auto pr-0.5',
        )}>
          {visible.map(item => (
            <CommentRow
              key={item.id}
              item={item}
              onDismiss={handleDismiss}
              dismissing={dismissingId === item.id}
            />
          ))}
        </div>
      )}

      {!expanded && hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors"
        >
          <ChevronDown size={14} />
          Show {activeItems.length - PREVIEW_LIMIT} more
        </button>
      )}
    </section>
  )
}
