'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export type ExternalRequestFormValues = ExternalRequestInput

type Props = {
  open: boolean
  onClose: () => void
  initialValues?: Partial<ExternalRequestFormValues>
  title?: string
  submitLabel?: string
  description?: string
}

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())
  const minReleaseDate = minReleaseDateFromRequest(new Date(), 3, [])

  useEffect(() => {
    if (!open) return
    setForm({ ...emptyForm(), ...initialValues })
    setError('')
  }, [open, initialValues])

  const set = (k: keyof ExternalRequestFormValues, v: string) =>
    setForm(f => ({ ...f, [k]: v }))

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
            options={CONTENT_TYPES.map(t => ({ value: t, label: t }))}
          />
          <Select
            label="Language *"
            placeholder="Select language"
            value={form.video_language}
            onChange={e => set('video_language', e.target.value)}
            options={VIDEO_LANGUAGES.map(l => ({ value: l, label: l }))}
          />
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
        <Input
          label="Script link *"
          placeholder="https://..."
          value={form.script_link}
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
          value={form.audio_link}
          onChange={e => set('audio_link', e.target.value)}
        />
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
