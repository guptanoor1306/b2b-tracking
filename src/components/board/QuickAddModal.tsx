'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { CONTENT_TYPES, LEVELS_OF_VIDEO, PRIORITIES } from '@/lib/constants'
import { Profile } from '@/lib/types'
import { createProject } from '@/lib/actions/projects'
import { computeTargetReleaseDateString } from '@/lib/timelines'
import { formatDate } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  users: Profile[]
  holidays?: string[]
}

const emptyForm = () => ({
  title: '',
  ip: '',
  content_type: '',
  level_of_video: '',
  priority: '',
  editor: '',
  received_date: '',
})

export function QuickAddModal({ open, onClose, users, holidays = [] }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const estimatedRelease = form.received_date
    ? computeTargetReleaseDateString(form.received_date, holidays)
    : null

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const result = await createProject({
      title: form.title.trim() || undefined,
      ip: form.ip.trim() || undefined,
      content_type: form.content_type || undefined,
      level_of_video: form.level_of_video || null,
      priority: form.priority || undefined,
      editor: form.editor || null,
      received_date: form.received_date || null,
      picked_up_date: form.received_date || null,
    })

    setLoading(false)
    if ('error' in result && result.error) { setError(result.error); return }

    setForm(emptyForm())
    onClose()
    router.refresh()
    if ('id' in result && result.id) router.push(`/projects/${result.id}`)
  }

  const editorOptions = users.map(u => ({ value: u.name, label: u.name }))

  return (
    <Modal open={open} onClose={onClose} title="New project" size="md">
      <div className="space-y-3">
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <Input label="Project name" value={form.title} onChange={e => set('title', e.target.value)} />
        <Input label="IP" placeholder="Enter IP" value={form.ip} onChange={e => set('ip', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" placeholder="Select type" options={CONTENT_TYPES.map(t => ({ value: t, label: t }))} value={form.content_type} onChange={e => set('content_type', e.target.value)} />
          <Select label="Level" placeholder="Select level" options={LEVELS_OF_VIDEO.map(l => ({ value: l, label: l }))} value={form.level_of_video} onChange={e => set('level_of_video', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" placeholder="Select priority" options={PRIORITIES.map(p => ({ value: p, label: p }))} value={form.priority} onChange={e => set('priority', e.target.value)} />
          <Select label="Editor" placeholder="Select editor" options={editorOptions} value={form.editor} onChange={e => set('editor', e.target.value)} />
        </div>
        <Input label="Start date" type="date" value={form.received_date} onChange={e => set('received_date', e.target.value)} />
        {estimatedRelease && (
          <p className="text-xs text-zinc-500">
            Target release (auto): <span className="text-zinc-300">{formatDate(estimatedRelease)}</span>
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Add to board</Button>
        </div>
      </div>
    </Modal>
  )
}
