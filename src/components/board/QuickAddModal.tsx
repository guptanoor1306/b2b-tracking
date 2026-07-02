'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { UserSearchSelect } from '@/components/ui/UserSearchSelect'
import { CONTENT_TYPES, PRIORITIES } from '@/lib/constants'
import { Profile } from '@/lib/types'
import { createProject } from '@/lib/actions/projects'
import { computeTargetReleaseDateString } from '@/lib/timelines'
import { formatDate } from '@/lib/utils'
import { useActiveChannel } from '@/context/ChannelContext'
import {
  isZerodhaChannelDbName,
  isZerodhaChannelSlug,
  projectLevelOptions,
  VIDEO_LANGUAGES,
} from '@/lib/zerodha-sla'

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
  video_language: '',
  level_of_video: '',
  priority: '',
  editor_id: '',
  editor_2_id: '',
  designer_id: '',
  designer_2_id: '',
  sound_designer_id: '',
  writer_id: '',
  external_team_member_id: '',
  received_date: '',
})

export function QuickAddModal({ open, onClose, users, holidays = [] }: Props) {
  const router = useRouter()
  const channel = useActiveChannel()
  const isZerodha = isZerodhaChannelSlug(channel?.slug) || isZerodhaChannelDbName(channel?.dbName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())

  const levelOptions = useMemo(
    () => projectLevelOptions(channel?.dbName, form.video_language || null),
    [channel?.dbName, form.video_language],
  )

  const set = (k: string, v: string) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'video_language' && isZerodha) {
      const valid = projectLevelOptions(channel?.dbName, v).map(o => o.value)
      if (next.level_of_video && !valid.includes(next.level_of_video)) {
        next.level_of_video = ''
      }
    }
    return next
  })

  const teamCtx = {
    level_of_video: form.level_of_video || null,
    video_language: form.video_language || null,
    channel: channel?.dbName ?? null,
    editor_id: form.editor_id || null,
    editor_2_id: form.editor_2_id || null,
    designer_id: form.designer_id || null,
    designer_2_id: form.designer_2_id || null,
  }

  const estimatedRelease = form.received_date && (!isZerodha || (form.video_language && form.level_of_video))
    ? computeTargetReleaseDateString(
        form.received_date,
        holidays,
        form.level_of_video || null,
        teamCtx,
        channel?.dbName,
      )
    : null

  const handleSubmit = async () => {
    if (isZerodha && !form.video_language) {
      setError('Video language is required')
      return
    }
    if (isZerodha && !form.level_of_video) {
      setError('Video level is required')
      return
    }

    setLoading(true)
    setError('')

    const editor = users.find(u => u.id === form.editor_id)

    const result = await createProject({
      title: form.title.trim() || undefined,
      ip: form.ip.trim() || undefined,
      content_type: form.content_type || undefined,
      video_language: form.video_language || null,
      level_of_video: form.level_of_video || null,
      priority: form.priority || undefined,
      editor: editor?.name ?? null,
      editor_id: form.editor_id || null,
      editor_2_id: form.editor_2_id || null,
      designer_id: form.designer_id || null,
      designer_2_id: form.designer_2_id || null,
      sound_designer_id: form.sound_designer_id || null,
      writer_id: form.writer_id || null,
      external_team_member_id: form.external_team_member_id || null,
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

  return (
    <Modal open={open} onClose={onClose} title="New project" size="lg">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Input label="Project name" value={form.title} onChange={e => set('title', e.target.value)} />
        <Input label="IP" placeholder="Enter IP" value={form.ip} onChange={e => set('ip', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" placeholder="Select type" options={CONTENT_TYPES.map(t => ({ value: t, label: t }))} value={form.content_type} onChange={e => set('content_type', e.target.value)} />
          {isZerodha ? (
            <>
              <Select
                label="Language"
                placeholder="Select language"
                required
                options={VIDEO_LANGUAGES.map(l => ({ value: l, label: l }))}
                value={form.video_language}
                onChange={e => set('video_language', e.target.value)}
              />
              <Select
                label="Level"
                placeholder={form.video_language ? 'Select level' : 'Select language first'}
                required
                options={levelOptions}
                value={form.level_of_video}
                onChange={e => set('level_of_video', e.target.value)}
              />
            </>
          ) : (
            <Select label="Level" placeholder="Select level" options={levelOptions} value={form.level_of_video} onChange={e => set('level_of_video', e.target.value)} />
          )}
        </div>
        <Select label="Priority" placeholder="Select priority" options={PRIORITIES.map(p => ({ value: p, label: p }))} value={form.priority} onChange={e => set('priority', e.target.value)} />
        <Input label="Start date" type="date" value={form.received_date} onChange={e => set('received_date', e.target.value)} />

        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 pt-2">Team</p>
        <div className="grid grid-cols-2 gap-3">
          <UserSearchSelect label="Editor" users={users} value={form.editor_id} onChange={v => set('editor_id', v)} />
          <UserSearchSelect label="Editor 2 (optional)" users={users} value={form.editor_2_id} onChange={v => set('editor_2_id', v)} />
          <UserSearchSelect label="Designer" users={users} value={form.designer_id} onChange={v => set('designer_id', v)} />
          <UserSearchSelect label="Designer 2 (optional)" users={users} value={form.designer_2_id} onChange={v => set('designer_2_id', v)} />
          <UserSearchSelect label="Sound designer" users={users} value={form.sound_designer_id} onChange={v => set('sound_designer_id', v)} />
          <UserSearchSelect label="Writer" users={users} value={form.writer_id} onChange={v => set('writer_id', v)} />
          <UserSearchSelect label="External team member" users={users} value={form.external_team_member_id} onChange={v => set('external_team_member_id', v)} />
        </div>

        {estimatedRelease && (
          <p className="text-xs text-zinc-500">
            Target release (auto): <span className="font-medium text-zinc-700">{formatDate(estimatedRelease)}</span>
            {(form.editor_2_id || form.designer_2_id) && (
              <span className="text-violet-600"> · dual assignee discount applied</span>
            )}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Add to board</Button>
        </div>
      </div>
    </Modal>
  )
}
