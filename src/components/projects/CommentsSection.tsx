'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Comment } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { addComment } from '@/lib/actions/projects'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { MessageSquare, CornerDownRight } from 'lucide-react'

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

type Props = { projectId: string; comments: Comment[]; canAdd?: boolean }

function ReplyForm({
  projectId, parentId, onDone,
}: { projectId: string; parentId: string; onDone: () => void }) {
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
    <div className="mt-2 ml-6 pl-3 border-l border-indigo-500/20 space-y-2">
      <Textarea
        placeholder="Write a reply…"
        value={text}
        onChange={e => setText(e.target.value)}
        className="text-xs min-h-[60px]"
      />
      <div className="flex gap-2">
        <Button size="sm" loading={loading} onClick={submit} className="h-7 text-xs">Reply</Button>
        <Button size="sm" variant="secondary" onClick={onDone} className="h-7 text-xs">Cancel</Button>
      </div>
    </div>
  )
}

function CommentItem({
  node, projectId, canAdd, depth = 0,
}: { node: CommentNode; projectId: string; canAdd: boolean; depth?: number }) {
  const [replyOpen, setReplyOpen] = useState(false)

  return (
    <div className={depth > 0 ? 'ml-6 pl-3 border-l border-white/[0.06]' : ''}>
      <div className="rounded-md px-3 py-2 bg-white/[0.02] border border-white/[0.05]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-zinc-300">{node.author?.name ?? 'Unknown'}</span>
          <span className="text-[10px] text-zinc-600">{formatDate(node.created_at, 'dd MMM yyyy HH:mm')}</span>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{node.comment}</p>
        {canAdd && depth === 0 && (
          <button
            type="button"
            onClick={() => setReplyOpen(v => !v)}
            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-indigo-400 transition-colors"
          >
            <CornerDownRight size={11} /> Reply
          </button>
        )}
      </div>
      {replyOpen && (
        <ReplyForm projectId={projectId} parentId={node.id} onDone={() => setReplyOpen(false)} />
      )}
      {node.replies.map(r => (
        <div key={r.id} className="mt-2">
          <CommentItem
            node={{ ...r, replies: [] }}
            projectId={projectId}
            canAdd={false}
            depth={1}
          />
        </div>
      ))}
    </div>
  )
}

export function CommentsSection({ projectId, comments, canAdd = true }: Props) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const tree = buildTree(comments)

  const handleAdd = async () => {
    if (!text.trim()) return
    setLoading(true)
    await addComment(projectId, text.trim())
    setText('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {tree.length === 0 && (
        <div className="flex items-center gap-2 py-4 text-zinc-600">
          <MessageSquare size={14} />
          <p className="text-xs">No comments yet. Start the conversation below.</p>
        </div>
      )}
      <div className="space-y-2">
        {tree.map(node => (
          <CommentItem key={node.id} node={node} projectId={projectId} canAdd={canAdd} />
        ))}
      </div>
      {canAdd && (
        <div className="space-y-2 pt-2 border-t border-white/[0.06]">
          <Textarea
            placeholder="Add a comment…"
            value={text}
            onChange={e => setText(e.target.value)}
            className="min-h-[72px]"
          />
          <Button size="sm" loading={loading} onClick={handleAdd} className="h-8">Post comment</Button>
        </div>
      )}
    </div>
  )
}
