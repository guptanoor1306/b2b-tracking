'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { createExternalProjectRequest } from '@/lib/actions/projects'

type Props = {
  open: boolean
  onClose: () => void
}

const emptyForm = () => ({
  title: '',
  script_link: '',
  drive_link: '',
  screen_captures_link: '',
  audio_link: '',
  thumbnail_copy: '',
})

export function ExternalRequestModal({ open, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())

  const set = (k: keyof ReturnType<typeof emptyForm>, v: string) =>
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
    <Modal open={open} onClose={handleClose} title="Create production request" size="lg">
      <p className="mb-4 text-sm text-zinc-500">
        Submit a new video request. It will appear on the board in <strong>Request Received</strong> for internal review.
      </p>
      <div className="space-y-3">
        <Input
          label="Title *"
          placeholder="Video title"
          value={form.title}
          onChange={e => set('title', e.target.value)}
        />
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
          value={form.screen_captures_link}
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
          Submit request
        </Button>
      </div>
    </Modal>
  )
}
