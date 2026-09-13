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
import { useActiveChannel } from '@/context/ChannelContext'
import {
  isZerodhaChannelDbName,
  isZerodhaChannelSlug,
  usesExternalIntakeFlow,
  projectLevelOptions,
  VIDEO_LANGUAGES,
} from '@/lib/zerodha-sla'
import {
  isLaSocialChannelDbName,
  LA_SOCIAL_CONTENT_TYPES,
  LA_SOCIAL_IPS,
} from '@/lib/la-social-sla'

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
  internal_owner_id: '',
  editor_id: '',
  editor_2_id: '',
  designer_id: '',
  designer_2_id: '',
  sound_designer_id: '',
  writer_id: '',
  qc_reviewer_id: '',
  external_team_member_id: '',
  received_date: '',
  target_delivery_date: '',
  drive_link: '',
})

export function QuickAddModal({ open, onClose, users, holidays = [] }: Props) {
  const router = useRouter()
  const channel = useActiveChannel()
  const isZerodha = isZerodhaChannelSlug(channel?.slug) || isZerodhaChannelDbName(channel?.dbName)
  const isLaSocial = isLaSocialChannelDbName(channel?.dbName)
  const externalIntake = usesExternalIntakeFlow(channel?.dbName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm())

  const levelOptions = useMemo(
    () => projectLevelOptions(channel?.dbName, form.video_language || null),
    [channel?.dbName, form.video_language],
  )

  const ipOptions = useMemo(() => {
    if (!isLaSocial) return []
    const known = LA_SOCIAL_IPS.map(ip => ({ value: ip, label: ip }))
    const custom = form.ip.trim() && !LA_SOCIAL_IPS.includes(form.ip.trim() as typeof LA_SOCIAL_IPS[number])
      ? [{ value: form.ip.trim(), label: form.ip.trim() }]
      : []
    return [...known, ...custom, { value: '__custom__', label: 'Other (type below)' }]
  }, [isLaSocial, form.ip])

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

  const handleSubmit = async () => {
    if (externalIntake && !isZerodha && !form.target_delivery_date) {
      setError('Release date is required')
      return
    }
    if (isZerodha && !form.video_language) {
      setError('Video language is required')
      return
    }
    if (isZerodha && !form.level_of_video) {
      setError('Video level is required')
      return
    }
    if (isZerodha && !form.target_delivery_date) {
      setError('Release date is required')
      return
    }
    if (isLaSocial && !form.title.trim()) {
      setError('Project name is required')
      return
    }
    if (isLaSocial && !form.ip.trim()) {
      setError('IP is required')
      return
    }
    if (isLaSocial && !form.content_type) {
      setError('Type is required')
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
      qc_reviewer_id: form.qc_reviewer_id || null,
      internal_owner_id: form.internal_owner_id || null,
      external_team_member_id: form.external_team_member_id || null,
      received_date: form.received_date || null,
      picked_up_date: form.received_date || null,
      target_delivery_date: externalIntake ? (form.target_delivery_date || null) : null,
      drive_link: isLaSocial ? (form.drive_link.trim() || null) : undefined,
    })

    setLoading(false)
    if ('error' in result && result.error) { setError(result.error); return }

    setForm(emptyForm())
    onClose()
    router.refresh()
    if ('id' in result && result.id) router.push(`/projects/${result.id}`)
  }

  const typeOptions = isLaSocial
    ? LA_SOCIAL_CONTENT_TYPES.map(t => ({ value: t, label: t }))
    : CONTENT_TYPES.map(t => ({ value: t, label: t }))

  return (
    <Modal open={open} onClose={onClose} title="New project" size="lg">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Input label="Project name" value={form.title} onChange={e => set('title', e.target.value)} />
        {isLaSocial ? (
          <>
            <Select
              label="IP"
              placeholder="Select IP"
              options={ipOptions}
              value={LA_SOCIAL_IPS.includes(form.ip as typeof LA_SOCIAL_IPS[number]) ? form.ip : (form.ip ? '__custom__' : '')}
              onChange={e => {
                const v = e.target.value
                if (v === '__custom__') set('ip', form.ip || '')
                else set('ip', v)
              }}
            />
            {(!form.ip || !LA_SOCIAL_IPS.includes(form.ip as typeof LA_SOCIAL_IPS[number])) && (
              <Input label="IP name" placeholder="e.g. PS" value={form.ip} onChange={e => set('ip', e.target.value)} />
            )}
          </>
        ) : (
          <Input label="IP" placeholder="Enter IP" value={form.ip} onChange={e => set('ip', e.target.value)} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" placeholder="Select type" options={typeOptions} value={form.content_type} onChange={e => set('content_type', e.target.value)} />
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
          ) : !isLaSocial ? (
            <Select label="Level" placeholder="Select level" options={levelOptions} value={form.level_of_video} onChange={e => set('level_of_video', e.target.value)} />
          ) : null}
        </div>
        {isLaSocial && (
          <Input
            label="Brief link (optional)"
            placeholder="https://..."
            value={form.drive_link}
            onChange={e => set('drive_link', e.target.value)}
          />
        )}
        {!isLaSocial && (
          <Select label="Priority" placeholder="Select priority" options={PRIORITIES.map(p => ({ value: p, label: p }))} value={form.priority} onChange={e => set('priority', e.target.value)} />
        )}
        {!isLaSocial && (
          <Input label="Start date" type="date" value={form.received_date} onChange={e => set('received_date', e.target.value)} />
        )}
        {externalIntake && (
          <Input label="Release date *" type="date" value={form.target_delivery_date} onChange={e => set('target_delivery_date', e.target.value)} />
        )}

        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 pt-2">Team</p>
        <div className="grid grid-cols-2 gap-3">
          {isLaSocial ? (
            <>
              <UserSearchSelect label="Primary POC" users={users} value={form.internal_owner_id} onChange={v => set('internal_owner_id', v)} />
              <UserSearchSelect label="Writer" users={users} value={form.writer_id} onChange={v => set('writer_id', v)} />
              <UserSearchSelect label="Writing reviewer" users={users} value={form.qc_reviewer_id} onChange={v => set('qc_reviewer_id', v)} />
              <UserSearchSelect label="Designer" users={users} value={form.designer_id} onChange={v => set('designer_id', v)} />
              <UserSearchSelect label="Editor" users={users} value={form.editor_id} onChange={v => set('editor_id', v)} />
              <UserSearchSelect label="Editor 2 (optional)" users={users} value={form.editor_2_id} onChange={v => set('editor_2_id', v)} />
            </>
          ) : (
            <>
              <UserSearchSelect label="Editor" users={users} value={form.editor_id} onChange={v => set('editor_id', v)} />
              <UserSearchSelect label="Editor 2 (optional)" users={users} value={form.editor_2_id} onChange={v => set('editor_2_id', v)} />
              <UserSearchSelect label="Designer" users={users} value={form.designer_id} onChange={v => set('designer_id', v)} />
              <UserSearchSelect label="Designer 2 (optional)" users={users} value={form.designer_2_id} onChange={v => set('designer_2_id', v)} />
              <UserSearchSelect label="Sound designer" users={users} value={form.sound_designer_id} onChange={v => set('sound_designer_id', v)} />
              <UserSearchSelect label="Writer" users={users} value={form.writer_id} onChange={v => set('writer_id', v)} />
              <UserSearchSelect label="External team member" users={users} value={form.external_team_member_id} onChange={v => set('external_team_member_id', v)} />
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSubmit}>Add to board</Button>
        </div>
      </div>
    </Modal>
  )
}
