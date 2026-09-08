'use client'

import { useState } from 'react'
import { ExternalLink, Pencil, X, Check } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function normalizeLinkHref(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

type ProjectLinkFieldProps = {
  label: string
  url: string | null | undefined
  canEdit: boolean
  onSave: (value: string) => Promise<void>
  placeholder?: string
}

export function ProjectLinkField({
  label,
  url,
  canEdit,
  onSave,
  placeholder = 'https://...',
}: ProjectLinkFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)

  const href = normalizeLinkHref(url)

  const startEdit = () => {
    setDraft(url?.trim() ?? '')
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setDraft('')
  }

  const save = async () => {
    setLoading(true)
    try {
      await onSave(draft)
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  if (editing) {
    return (
      <div className="border-b border-zinc-100 py-2.5 last:border-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        <div className="mt-1.5 flex items-end gap-1.5">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1"
          />
          <Button size="sm" variant="ghost" onClick={cancel} disabled={loading} aria-label="Cancel">
            <X size={14} />
          </Button>
          <Button size="sm" loading={loading} onClick={save} aria-label="Save">
            <Check size={14} />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-zinc-100 py-2.5 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        {canEdit && (
          <button
            type="button"
            onClick={startEdit}
            className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label={`Edit ${label}`}
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
      {!href ? (
        <p className="mt-1 text-xs italic text-zinc-400">Not added</p>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={href}
          className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-violet-700 hover:text-violet-800"
        >
          <ExternalLink size={11} className="shrink-0" />
          <span className="truncate">{href}</span>
        </a>
      )}
    </div>
  )
}

type ProjectTextFieldProps = {
  label: string
  value: string | null | undefined
  canEdit: boolean
  onSave: (value: string) => Promise<void>
  multiline?: boolean
  placeholder?: string
}

export function ProjectTextField({
  label,
  value,
  canEdit,
  onSave,
  multiline = false,
  placeholder = '',
}: ProjectTextFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)

  const text = value?.trim()

  const startEdit = () => {
    setDraft(value?.trim() ?? '')
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setDraft('')
  }

  const save = async () => {
    setLoading(true)
    try {
      await onSave(draft)
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  if (editing) {
    return (
      <div className="border-b border-zinc-100 py-2.5 last:border-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        <div className="mt-1.5 space-y-1.5">
          {multiline ? (
            <Textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={placeholder}
              rows={3}
            />
          ) : (
            <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder} />
          )}
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={cancel} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" loading={loading} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-zinc-100 py-2.5 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
        {canEdit && (
          <button
            type="button"
            onClick={startEdit}
            className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label={`Edit ${label}`}
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
      <p className={cn('mt-1 text-xs leading-relaxed break-words', text ? 'text-zinc-800' : 'italic text-zinc-400')}>
        {text || 'Not added'}
      </p>
    </div>
  )
}
