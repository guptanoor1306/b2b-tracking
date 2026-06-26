'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Profile } from '@/lib/types'
import { CONTENT_TYPES, LEVELS_OF_VIDEO, PRIORITIES, STAGES_INTERNAL, FIRST_CUT_STAGE } from '@/lib/constants'
import { computeTargetReleaseDateString } from '@/lib/timelines'
import { needsTeleprompterPrompt } from '@/components/projects/StageChangeModal'
import { formatDate } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { SlideOver, SlideOverSection } from '@/components/ui/SlideOver'
import { UserSearchSelect } from '@/components/ui/UserSearchSelect'
import { updateProject, changeProjectStage } from '@/lib/actions/projects'

type Props = {
  open: boolean
  onClose: () => void
  project: Project
  users: Profile[]
  holidays?: string[]
}

export function ProjectEditModal({ open, onClose, project, users, holidays = [] }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: project.title,
    ip: project.ip === '—' ? '' : project.ip,
    content_type: project.content_type,
    level_of_video: project.level_of_video ?? '',
    priority: project.priority,
    editor_id: project.editor_id ?? '',
    editor_2_id: project.editor_2_id ?? '',
    designer_id: project.designer_id ?? project.graphic_designer_id ?? '',
    designer_2_id: project.designer_2_id ?? '',
    sound_designer_id: project.sound_designer_id ?? '',
    writer_id: project.writer_id ?? '',
    external_team_member_id: project.external_team_member_id ?? '',
    uses_teleprompter: project.uses_teleprompter === true ? 'yes' : project.uses_teleprompter === false ? 'no' : '',
    thumbnail_copy: project.thumbnail_copy ?? '',
    title_copy: project.title_copy ?? '',
    drive_link: project.drive_link ?? '',
    assets_link: project.assets_link ?? '',
    current_stage: project.current_stage,
    received_date: project.received_date ?? '',
    notes: project.notes ?? '',
  })

  const teamCtx = {
    level_of_video: form.level_of_video || null,
    editor_id: form.editor_id || null,
    editor_2_id: form.editor_2_id || null,
    designer_id: form.designer_id || null,
    designer_2_id: form.designer_2_id || null,
    uses_teleprompter: form.uses_teleprompter === 'yes' ? true : form.uses_teleprompter === 'no' ? false : null,
  }

  const computedTarget = form.received_date
    ? computeTargetReleaseDateString(form.received_date, holidays, form.level_of_video || null, teamCtx)
    : project.target_delivery_date

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const stageChangingToFirstCut = needsTeleprompterPrompt(project.current_stage, form.current_stage)

  const handleSave = async () => {
    if (stageChangingToFirstCut && !form.uses_teleprompter) return
    setLoading(true)

    if (form.current_stage !== project.current_stage) {
      await changeProjectStage(
        project.id,
        form.current_stage,
        undefined,
        undefined,
        stageChangingToFirstCut ? form.uses_teleprompter === 'yes' : undefined
      )
    }

    await updateProject(project.id, {
      title: form.title.trim() || 'Untitled project',
      ip: form.ip.trim() || '—',
      content_type: form.content_type || CONTENT_TYPES[0],
      level_of_video: form.level_of_video || null,
      priority: form.priority,
      editor_id: form.editor_id || null,
      editor_2_id: form.editor_2_id || null,
      designer_id: form.designer_id || null,
      designer_2_id: form.designer_2_id || null,
      sound_designer_id: form.sound_designer_id || null,
      writer_id: form.writer_id || null,
      external_team_member_id: form.external_team_member_id || null,
      uses_teleprompter: form.uses_teleprompter === 'yes' ? true : form.uses_teleprompter === 'no' ? false : null,
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

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Edit project"
      subtitle={project.title}
      width="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSave} disabled={stageChangingToFirstCut && !form.uses_teleprompter}>
            Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <SlideOverSection title="Basics">
          <Input label="Project name" value={form.title} onChange={e => set('title', e.target.value)} />
          <Input label="IP" placeholder="Enter IP" value={form.ip} onChange={e => set('ip', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" placeholder="Select type" options={CONTENT_TYPES.map(t => ({ value: t, label: t }))} value={form.content_type} onChange={e => set('content_type', e.target.value)} />
            <Select label="Level" placeholder="Select level" options={LEVELS_OF_VIDEO.map(l => ({ value: l, label: l }))} value={form.level_of_video} onChange={e => set('level_of_video', e.target.value)} />
          </div>
          <Select label="Priority" options={PRIORITIES.map(p => ({ value: p, label: p }))} value={form.priority} onChange={e => set('priority', e.target.value)} />
        </SlideOverSection>

        <SlideOverSection title="Team">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UserSearchSelect label="Editor" users={users} value={form.editor_id} onChange={v => set('editor_id', v)} />
            <UserSearchSelect label="Editor 2 (optional)" users={users} value={form.editor_2_id} onChange={v => set('editor_2_id', v)} />
            <UserSearchSelect label="Designer" users={users} value={form.designer_id} onChange={v => set('designer_id', v)} />
            <UserSearchSelect label="Designer 2 (optional)" users={users} value={form.designer_2_id} onChange={v => set('designer_2_id', v)} />
            <UserSearchSelect label="Sound designer" users={users} value={form.sound_designer_id} onChange={v => set('sound_designer_id', v)} />
            <UserSearchSelect label="Writer" users={users} value={form.writer_id} onChange={v => set('writer_id', v)} />
            <UserSearchSelect label="External team member" users={users} value={form.external_team_member_id} onChange={v => set('external_team_member_id', v)} />
          </div>
        </SlideOverSection>

        <SlideOverSection title="Stage & dates">
          <Select label="Current stage" options={STAGES_INTERNAL.map(s => ({ value: s, label: s }))} value={form.current_stage} onChange={e => set('current_stage', e.target.value)} />

          {(stageChangingToFirstCut || form.current_stage === FIRST_CUT_STAGE) && (
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">Is Teleprompter Used</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => set('uses_teleprompter', 'yes')} className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${form.uses_teleprompter === 'yes' ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>Yes</button>
                <button type="button" onClick={() => set('uses_teleprompter', 'no')} className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${form.uses_teleprompter === 'no' ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}>No</button>
              </div>
            </div>
          )}

          <Input label="Start date" type="date" value={form.received_date} onChange={e => set('received_date', e.target.value)} />
          {computedTarget && (
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              Target release (auto): <span className="font-semibold text-zinc-800">{formatDate(computedTarget)}</span>
            </p>
          )}
        </SlideOverSection>

        <SlideOverSection title="Links & copy">
          <Input label="Thumbnail text" value={form.thumbnail_copy} onChange={e => set('thumbnail_copy', e.target.value)} />
          <Input label="Title copy" value={form.title_copy} onChange={e => set('title_copy', e.target.value)} />
          <Input label="Asset link" value={form.assets_link} onChange={e => set('assets_link', e.target.value)} />
          <Input label="Drive / video link" value={form.drive_link} onChange={e => set('drive_link', e.target.value)} />
        </SlideOverSection>

        <SlideOverSection title="Notes">
          <Textarea label="Internal notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
        </SlideOverSection>
      </div>
    </SlideOver>
  )
}
