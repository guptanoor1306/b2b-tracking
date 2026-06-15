'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Profile } from '@/lib/types'
import { CONTENT_TYPES, LEVELS_OF_VIDEO, PRIORITIES, STAGES_INTERNAL } from '@/lib/constants'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { UserSearchSelect } from '@/components/ui/UserSearchSelect'
import { updateProject, changeProjectStage, updateStageAssignee } from '@/lib/actions/projects'

type Props = {
  project: Project
  users: Profile[]
  graphicsDesigners: Profile[]
}

export function SimpleEditForm({ project, users, graphicsDesigners }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: project.title,
    ip: project.ip,
    content_type: project.content_type,
    level_of_video: project.level_of_video ?? LEVELS_OF_VIDEO[0],
    priority: project.priority,
    thumbnail_copy: project.thumbnail_copy ?? '',
    title_copy: project.title_copy ?? '',
    drive_link: project.drive_link ?? '',
    graphic_designer_id: project.graphic_designer_id ?? '',
    stage_assignee_id: project.stage_assignee_id ?? '',
    current_stage: project.current_stage,
    received_date: project.received_date ?? '',
    picked_up_date: project.picked_up_date ?? '',
    target_delivery_date: project.target_delivery_date ?? '',
    notes: project.notes ?? '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    if (form.current_stage !== project.current_stage) {
      await changeProjectStage(
        project.id,
        form.current_stage,
        undefined,
        form.stage_assignee_id || null
      )
    } else if (form.stage_assignee_id !== (project.stage_assignee_id ?? '')) {
      await updateStageAssignee(project.id, form.stage_assignee_id || null)
    }
    await updateProject(project.id, {
      title: form.title,
      ip: form.ip,
      content_type: form.content_type,
      level_of_video: form.level_of_video,
      priority: form.priority,
      thumbnail_copy: form.thumbnail_copy || null,
      title_copy: form.title_copy || null,
      drive_link: form.drive_link || null,
      graphic_designer_id: form.graphic_designer_id || null,
      received_date: form.received_date || null,
      picked_up_date: form.picked_up_date || null,
      target_delivery_date: form.target_delivery_date || null,
      notes: form.notes || null,
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <Card className="p-5 space-y-4">
      <Input label="Video name" value={form.title} onChange={e => set('title', e.target.value)} />
      <Input label="IP" placeholder="Enter IP" value={form.ip} onChange={e => set('ip', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Type" options={CONTENT_TYPES.map(t => ({ value: t, label: t }))} value={form.content_type} onChange={e => set('content_type', e.target.value)} />
        <Select label="Level of video" options={LEVELS_OF_VIDEO.map(l => ({ value: l, label: l }))} value={form.level_of_video} onChange={e => set('level_of_video', e.target.value)} />
      </div>
      <Select label="Priority" options={PRIORITIES.map(p => ({ value: p, label: p }))} value={form.priority} onChange={e => set('priority', e.target.value)} />
      <Input label="Thumbnail text" value={form.thumbnail_copy} onChange={e => set('thumbnail_copy', e.target.value)} />
      <Input label="Title copy" value={form.title_copy} onChange={e => set('title_copy', e.target.value)} />
      <Input label="Drive link" value={form.drive_link} onChange={e => set('drive_link', e.target.value)} />
      <UserSearchSelect
        label="Graphics designer"
        users={graphicsDesigners}
        value={form.graphic_designer_id}
        onChange={v => set('graphic_designer_id', v)}
        placeholder="Select designer"
      />
      <Select label="Stage" options={STAGES_INTERNAL.map(s => ({ value: s, label: s }))} value={form.current_stage} onChange={e => set('current_stage', e.target.value)} />
      <UserSearchSelect
        label="Stage assignee"
        users={users}
        value={form.stage_assignee_id}
        onChange={v => set('stage_assignee_id', v)}
        placeholder="Assign for reminders"
      />
      <div className="grid grid-cols-3 gap-3">
        <Input label="Received" type="date" value={form.received_date} onChange={e => set('received_date', e.target.value)} />
        <Input label="Picked up" type="date" value={form.picked_up_date} onChange={e => set('picked_up_date', e.target.value)} />
        <Input label="Target" type="date" value={form.target_delivery_date} onChange={e => set('target_delivery_date', e.target.value)} />
      </div>
      <Textarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
      <Button loading={loading} onClick={handleSave}>Save changes</Button>
    </Card>
  )
}
