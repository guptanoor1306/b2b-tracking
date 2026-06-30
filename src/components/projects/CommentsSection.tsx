'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Comment } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { addComment, deleteComment } from '@/lib/actions/projects'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { MessageSquare, CornerDownRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type CommentNode = Comment & { replies: Comment[] }

function buildTree(comments: Comment[]): CommentNode[] {
  const sorted = [...comments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const roots = sorted.filter(c => !c.parent_id).reverse()
  return roots.map(root => ({
    ...root,
    replies: sorted.filter(c => c.parent_id === root.id),
  }))
}

type Props = { projectId: string; comments: Comment[]; canAdd?: boolean; variant?: 'dark' | 'light'; compact?: boolean }

function ReplyForm({
  projectId, parentId, onDone, light = false,
}: { projectId: string; parentId: string; onDone: () => void; light?: boolean }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!text.trim()) return
    setLoading(true)
    await addComment(projectId, text.trim(), parentId)
    setText('')
    setLoading(false)
    onDone()
    router.refresh()
  }

  return (
    <div className={cn('mt-2 ml-6 pl-3 border-l space-y-2 min-w-0', light ? 'border-violet-100' : 'border-indigo-500/20')}>
      <Textarea
        placeholder="Write a reply…"
        value={text}
        onChange={e => setText(e.target.value)}
        className={cn('text-xs min-h-[60px]', light && 'v2-textarea')}
      />
      <div className="flex gap-2">
        <Button size="sm" loading={loading} onClick={submit} className={cn('h-7 text-xs', light && 'v2-btn-primary')}>Reply</Button>
        <Button size="sm" variant="secondary" onClick={onDone} className={cn('h-7 text-xs', light && 'v2-btn-secondary')}>Cancel</Button>
      </div>
    </div>
  )
}

function CommentItem({
  node, projectId, canAdd, currentUserId, depth = 0, light = false,
}: {
  node: CommentNode
  projectId: string
  canAdd: boolean
  currentUserId?: string | null
  depth?: number
  light?: boolean
}) {
  const router = useRouter()
  const [replyOpen, setReplyOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canDelete = !!currentUserId && node.created_by === currentUserId

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteComment(projectId, node.id)
    setDeleting(false)
    if (!result.error) router.refresh()
  }

  return (
    <div className={cn('min-w-0', depth > 0 ? cn('ml-6 pl-3 border-l', light ? 'border-violet-100' : 'border-white/[0.06]') : '')}>
      <div className={cn(
        'rounded-lg px-3 py-2 border min-w-0',
        light
          ? 'bg-zinc-50 border-zinc-100'
          : 'bg-white/[0.02] border-white/[0.05]'
      )}>
        <div className="flex items-start justify-between gap-2 mb-1 min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={cn('text-xs font-medium shrink-0', light ? 'text-zinc-800' : 'text-zinc-300')}>
              {node.author?.name ?? 'Unknown'}
            </span>
            <span className={cn('text-[10px] shrink-0', light ? 'text-zinc-400' : 'text-zinc-600')}>
              {formatDate(node.created_at, 'dd MMM yyyy HH:mm')}
            </span>
          </div>
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              title="Delete your comment"
              className={cn(
                'shrink-0 rounded p-1 transition-colors disabled:opacity-50',
                light ? 'text-zinc-400 hover:bg-red-50 hover:text-red-600' : 'text-zinc-500 hover:text-rose-400'
              )}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
        <p className={cn(
          'text-sm leading-relaxed break-words whitespace-pre-wrap',
          light ? 'text-zinc-700' : 'text-zinc-300'
        )}>
          {node.comment}
        </p>
        {canAdd && depth === 0 && (
          <button
            type="button"
            onClick={() => setReplyOpen(v => !v)}
            className={cn(
              'mt-1.5 inline-flex items-center gap-1 text-[11px] transition-colors',
              light ? 'text-zinc-500 hover:text-violet-600' : 'text-zinc-500 hover:text-indigo-400'
            )}
          >
            <CornerDownRight size={11} /> Reply
          </button>
        )}
      </div>
      {replyOpen && (
        <ReplyForm projectId={projectId} parentId={node.id} onDone={() => setReplyOpen(false)} light={light} />
      )}
      {node.replies.map(r => (
        <div key={r.id} className="mt-2 min-w-0">
          <CommentItem
            node={{ ...r, replies: [] }}
            projectId={projectId}
            canAdd={false}
            currentUserId={currentUserId}
            depth={1}
            light={light}
          />
        </div>
      ))}
    </div>
  )
}

export function CommentsSection({ projectId, comments, canAdd = true, variant = 'light', compact = false }: Props) {
  const router = useRouter()
  const { profile } = useAuth()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const tree = buildTree(comments)
  const light = variant === 'light'

  const handleAdd = async () => {
    if (!text.trim()) return
    setLoading(true)
    await addComment(projectId, text.trim())
    setText('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="min-w-0 space-y-3">
      {tree.length === 0 && (
        <div className={cn('flex items-center gap-2 py-2', light ? 'text-zinc-400' : 'text-zinc-600')}>
          <MessageSquare size={14} />
          <p className="text-xs">No comments yet.</p>
        </div>
      )}
      {tree.length > 0 && (
        <div className={cn(
          'overflow-x-hidden pr-1 min-w-0',
          compact ? 'space-y-2' : 'max-h-[min(28rem,50vh)] overflow-y-auto',
        )}>
          <div className="space-y-2 min-w-0">
            {tree.map(node => (
              <CommentItem
                key={node.id}
                node={node}
                projectId={projectId}
                canAdd={canAdd}
                currentUserId={profile?.id}
                light={light}
              />
            ))}
          </div>
        </div>
      )}
      {canAdd && (
        <div className={cn('space-y-2 pt-2 border-t min-w-0', light ? 'border-zinc-100' : 'border-white/[0.06]')}>
          <Textarea
            placeholder="Add a comment…"
            value={text}
            onChange={e => setText(e.target.value)}
            className={cn(compact ? 'min-h-[56px]' : 'min-h-[72px]', 'w-full', light && 'v2-textarea')}
          />
          <Button size="sm" loading={loading} onClick={handleAdd} className={cn('h-8', light && 'v2-btn-primary')}>
            Post comment
          </Button>
        </div>
      )}
    </div>
  )
}
