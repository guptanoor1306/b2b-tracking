'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Profile } from '@/lib/types'
import { CONTENT_TYPES, LEVELS_OF_VIDEO, PRIORITIES, STAGES_INTERNAL } from '@/lib/constants'
import { computeTargetReleaseDateString } from '@/lib/timelines'
import { formatDate } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { UserSearchSelect } from '@/components/ui/UserSearchSelect'
import { updateProject, changeProjectStage, updateStageAssignee } from '@/lib/actions/projects'

type Props = {
  open: boolean
  onClose: () => void
  project: Project
  users: Profile[]
  graphicsDesigners: Profile[]
  holidays?: string[]
}

export function ProjectEditModal({ open, onClose, project, users, graphicsDesigners, holidays = [] }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: project.title,
    ip: project.ip === '—' ? '' : project.ip,
    content_type: project.content_type,
    level_of_video: project.level_of_video ?? '',
    priority: project.priority,
    editor: project.editor ?? '',
    thumbnail_copy: project.thumbnail_copy ?? '',
    title_copy: project.title_copy ?? '',
    drive_link: project.drive_link ?? '',
    assets_link: project.assets_link ?? '',
    stage_assignee_id: project.stage_assignee_id ?? '',
    current_stage: project.current_stage,
    received_date: project.received_date ?? '',
    notes: project.notes ?? '',
  })

  const computedTarget = form.received_date
    ? computeTargetReleaseDateString(form.received_date, holidays)
    : project.target_delivery_date

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
      title: form.title.trim() || 'Untitled project',
      ip: form.ip.trim() || '—',
      content_type: form.content_type || CONTENT_TYPES[0],
      level_of_video: form.level_of_video || null,
      priority: form.priority,
      editor: form.editor || null,
      thumbnail_copy: form.thumbnail_copy || null,
      title_copy: form.title_copy || null,
      drive_link: form.drive_link || null,
      assets_link: form.assets_link || null,
      received_date: form.received_date || null,
      picked_up_date: form.received_date || null,
      notes: form.notes || null,
    })
    setLoading(false)
    onClose()
    router.refresh()
  }

  const editorOptions = users.map(u => ({ value: u.name, label: u.name }))

  return (
    <Modal open={open} onClose={onClose} title="Edit project" size="lg">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <Input label="Project name" value={form.title} onChange={e => set('title', e.target.value)} />
        <Input label="IP" placeholder="Enter IP" value={form.ip} onChange={e => set('ip', e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Type" placeholder="Select type" options={CONTENT_TYPES.map(t => ({ value: t, label: t }))} value={form.content_type} onChange={e => set('content_type', e.target.value)} />
          <Select label="Level" placeholder="Select level" options={LEVELS_OF_VIDEO.map(l => ({ value: l, label: l }))} value={form.level_of_video} onChange={e => set('level_of_video', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Priority" options={PRIORITIES.map(p => ({ value: p, label: p }))} value={form.priority} onChange={e => set('priority', e.target.value)} />
          <Select label="Editor" placeholder="Select editor" options={editorOptions} value={form.editor} onChange={e => set('editor', e.target.value)} />
        </div>
        <Input label="Thumbnail text" value={form.thumbnail_copy} onChange={e => set('thumbnail_copy', e.target.value)} />
        <Input label="Title copy" value={form.title_copy} onChange={e => set('title_copy', e.target.value)} />
        <Input label="Asset link" value={form.assets_link} onChange={e => set('assets_link', e.target.value)} />
        <Input label="Drive / video link" value={form.drive_link} onChange={e => set('drive_link', e.target.value)} />
        <Select label="Stage" options={STAGES_INTERNAL.map(s => ({ value: s, label: s }))} value={form.current_stage} onChange={e => set('current_stage', e.target.value)} />
        <UserSearchSelect label="Stage assignee" users={users} value={form.stage_assignee_id} onChange={v => set('stage_assignee_id', v)} placeholder="Assign for reminders" />
        <Input label="Start date" type="date" value={form.received_date} onChange={e => set('received_date', e.target.value)} />
        {computedTarget && (
          <p className="text-xs text-zinc-500">
            Target release (auto): <span className="text-zinc-300">{formatDate(computedTarget)}</span>
          </p>
        )}
        <Textarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
        <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-[#1a1a1a] pb-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  )
}
