'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { createExternalProjectRequest, type ExternalRequestInput } from '@/lib/actions/projects'
import { VIDEO_LANGUAGES } from '@/lib/zerodha-sla'
import { CONTENT_TYPES } from '@/lib/constants'
import { minReleaseDateFromRequest } from '@/lib/businessTime'
import { format, parseISO } from 'date-fns'
import { useActiveChannel } from '@/context/ChannelContext'
import {
  CASH_AND_COPIUM_CONTENT_TYPES,
  isCashAndCopiumChannelDbName,
  isCashAndCopiumChannelSlug,
} from '@/lib/external-intake-flow'
import type { ReelTimestampPair } from '@/lib/types'

export type ExternalRequestFormValues = ExternalRequestInput

type Props = {
  open: boolean
  onClose: () => void
  initialValues?: Partial<ExternalRequestFormValues>
  title?: string
  submitLabel?: string
  description?: string
}

const DEFAULT_REEL_TIMESTAMPS: ReelTimestampPair[] = [
  { start: '', end: '' },
  { start: '', end: '' },
]

const emptyForm = (): ExternalRequestFormValues => ({
  title: '',
  content_type: '',
  script_link: '',
  drive_link: '',
  screen_captures_link: '',
  audio_link: '',
  thumbnail_copy: '',
  target_delivery_date: '',
  video_language: '',
  reel_timestamps: DEFAULT_REEL_TIMESTAMPS.map(p => ({ ...p })),
})

export function ExternalRequestModal({
  open,
  onClose,
  initialValues,
  title = 'Create production request',
  submitLabel = 'Submit request',
  description = 'Submit a new video request. It will appear on the board in Request Received for internal review.',
}: Props) {
  const router = useRouter()
  const channel = useActiveChannel()
  const isCashCopium = isCashAndCopiumChannelSlug(channel?.slug)
    || isCashAndCopiumChannelDbName(channel?.dbName)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())
  const minReleaseDate = minReleaseDateFromRequest(new Date(), 3, [])

  useEffect(() => {
    if (!open) return
    setForm({
      ...emptyForm(),
      ...initialValues,
      reel_timestamps: initialValues?.reel_timestamps?.length
        ? initialValues.reel_timestamps
        : DEFAULT_REEL_TIMESTAMPS.map(p => ({ ...p })),
    })
    setError('')
  }, [open, initialValues])

  const set = (k: keyof ExternalRequestFormValues, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

  const setReelPair = (index: number, field: 'start' | 'end', value: string) => {
    setForm(f => ({
      ...f,
      reel_timestamps: (f.reel_timestamps ?? DEFAULT_REEL_TIMESTAMPS).map((p, i) =>
        i === index ? { ...p, [field]: value } : p,
      ),
    }))
  }

  const addReelPair = () => {
    setForm(f => ({
      ...f,
      reel_timestamps: [...(f.reel_timestamps ?? []), { start: '', end: '' }],
    }))
  }

  const removeReelPair = (index: number) => {
    setForm(f => ({
      ...f,
      reel_timestamps: (f.reel_timestamps ?? []).filter((_, i) => i !== index),
    }))
  }

  const handleClose = () => {
    setForm(emptyForm())
    setError('')
    onClose()
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const result = await createExternalProjectRequest(form)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    handleClose()
    router.push(result.id ? `/projects/${result.id}` : '/board')
    router.refresh()
  }

  const contentTypeOptions = isCashCopium
    ? CASH_AND_COPIUM_CONTENT_TYPES.map(t => ({ value: t, label: t }))
    : CONTENT_TYPES.map(t => ({ value: t, label: t }))

  const showReelTimestamps = isCashCopium && form.content_type === 'Reel'

  return (
    <Modal open={open} onClose={handleClose} title={title} size="lg">
      <p className="mb-4 text-sm text-zinc-500">{description}</p>
      <div className="space-y-3">
        <Input
          label="Title *"
          placeholder="Video title"
          value={form.title}
          onChange={e => set('title', e.target.value)}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Type of video *"
            placeholder="Select type"
            value={form.content_type}
            onChange={e => set('content_type', e.target.value)}
            options={contentTypeOptions}
          />
          {!isCashCopium && (
            <Select
              label="Language *"
              placeholder="Select language"
              value={form.video_language ?? ''}
              onChange={e => set('video_language', e.target.value)}
              options={VIDEO_LANGUAGES.map(l => ({ value: l, label: l }))}
            />
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Input
              label="Release date *"
              type="date"
              min={minReleaseDate}
              value={form.target_delivery_date}
              onChange={e => set('target_delivery_date', e.target.value)}
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Must be at least <strong>3 working days</strong> from today.
              Earliest: {format(parseISO(minReleaseDate), 'dd MMM yyyy')}.
            </p>
          </div>
        </div>
        {isCashCopium ? (
          <Input
            label="Drive link *"
            placeholder="https://..."
            value={form.drive_link}
            onChange={e => set('drive_link', e.target.value)}
          />
        ) : (
          <>
            <Input
              label="Script link *"
              placeholder="https://..."
              value={form.script_link ?? ''}
              onChange={e => set('script_link', e.target.value)}
            />
            <Input
              label="Video link *"
              placeholder="Drive or video URL"
              value={form.drive_link}
              onChange={e => set('drive_link', e.target.value)}
            />
            <Input
              label="Screen captures link"
              placeholder="https://... (optional)"
              value={form.screen_captures_link ?? ''}
              onChange={e => set('screen_captures_link', e.target.value)}
            />
            <Input
              label="Audio link *"
              placeholder="https://..."
              value={form.audio_link ?? ''}
              onChange={e => set('audio_link', e.target.value)}
            />
          </>
        )}
        {showReelTimestamps && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 space-y-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Start / end timestamps *</p>
              <p className="mt-0.5 text-xs text-zinc-500">At least one complete pair required for Reels.</p>
            </div>
            {(form.reel_timestamps ?? DEFAULT_REEL_TIMESTAMPS).map((pair, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    label={`Start ${index + 1}`}
                    placeholder="00:00"
                    value={pair.start}
                    onChange={e => setReelPair(index, 'start', e.target.value)}
                  />
                  <Input
                    label={`End ${index + 1}`}
                    placeholder="00:30"
                    value={pair.end}
                    onChange={e => setReelPair(index, 'end', e.target.value)}
                  />
                </div>
                {(form.reel_timestamps?.length ?? 0) > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReelPair(index)}
                    className="mb-2 shrink-0 text-zinc-400 hover:text-red-600"
                    aria-label="Remove timestamp pair"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <Button size="sm" variant="secondary" type="button" onClick={addReelPair}>
              <Plus size={14} /> Add timestamp pair
            </Button>
          </div>
        )}
        <Textarea
          label="Thumbnail copy *"
          placeholder="Text for the thumbnail"
          value={form.thumbnail_copy}
          onChange={e => set('thumbnail_copy', e.target.value)}
          rows={3}
        />
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button loading={loading} onClick={handleSubmit} className="v2-btn-primary">
          {submitLabel}
        </Button>
      </div>
    </Modal>
  )
}
