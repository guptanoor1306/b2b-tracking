'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Project, Profile, Priority } from '@/lib/types'
import { CONTENT_TYPES, PRIORITIES } from '@/lib/constants'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { SlideOver, SlideOverSection } from '@/components/ui/SlideOver'
import { UserSearchSelect } from '@/components/ui/UserSearchSelect'
import { updateProject } from '@/lib/actions/projects'
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
  project: Project
  users: Profile[]
}

function buildForm(project: Project) {
  return {
    title: project.title,
    ip: project.ip === '—' || project.ip === 'TBD' ? '' : project.ip,
    content_type: project.content_type,
    video_language: project.video_language ?? '',
    level_of_video: project.level_of_video ?? '',
    priority: project.priority ?? '',
    editor_id: project.editor_id ?? '',
    editor_2_id: project.editor_2_id ?? '',
    designer_id: project.designer_id ?? project.graphic_designer_id ?? '',
    designer_2_id: project.designer_2_id ?? '',
    sound_designer_id: project.sound_designer_id ?? '',
    writer_id: project.writer_id ?? '',
    external_team_member_id: project.external_team_member_id ?? '',
    qc_reviewer_id: project.qc_reviewer_id ?? '',
    assets_link: project.assets_link ?? '',
  }
}

export function ProjectEditModal({ open, onClose, project, users }: Props) {
  const router = useRouter()
  const channel = useActiveChannel()
  const isZerodha = isZerodhaChannelSlug(channel?.slug)
    || isZerodhaChannelDbName(channel?.dbName)
    || isZerodhaChannelDbName(project.channel)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editClientDetails, setEditClientDetails] = useState(false)
  const [form, setForm] = useState(() => buildForm(project))

  useEffect(() => {
    if (open) {
      setForm(buildForm(project))
      setEditClientDetails(false)
      setError('')
    }
  }, [open, project])

  const levelOptions = useMemo(
    () => projectLevelOptions(project.channel ?? channel?.dbName, form.video_language || null),
    [project.channel, channel?.dbName, form.video_language],
  )

  const clientSummary = [
    form.content_type,
    isZerodha && form.video_language ? form.video_language : null,
  ].filter(Boolean).join(' · ')

  const set = (k: string, v: string) => setForm(f => {
    const next = { ...f, [k]: v }
    if (k === 'video_language' && isZerodha) {
      const valid = projectLevelOptions(project.channel ?? channel?.dbName, v).map(o => o.value)
      if (next.level_of_video && !valid.includes(next.level_of_video)) {
        next.level_of_video = ''
      }
    }
    return next
  })

  const handleSave = async () => {
    setLoading(true)
    setError('')

    const result = await updateProject(project.id, {
      title: form.title.trim() || 'Untitled project',
      ip: form.ip.trim() || 'TBD',
      content_type: form.content_type || CONTENT_TYPES[0],
      ...(form.video_language ? { video_language: form.video_language } : {}),
      ...(form.level_of_video ? { level_of_video: form.level_of_video } : {}),
      ...(form.priority ? { priority: form.priority as Priority } : {}),
      editor_id: form.editor_id || null,
      editor_2_id: form.editor_2_id || null,
      designer_id: form.designer_id || null,
      designer_2_id: form.designer_2_id || null,
      sound_designer_id: form.sound_designer_id || null,
      writer_id: form.writer_id || null,
      external_team_member_id: form.external_team_member_id || null,
      ...(isZerodha ? { qc_reviewer_id: form.qc_reviewer_id || null } : {}),
      assets_link: form.assets_link || null,
    })
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Edit project"
      subtitle={project.title}
      width="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSave}>Save changes</Button>
        </div>
      }
    >
      {error && (
        <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="space-y-7">
        <SlideOverSection title="Client request">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3.5">
            <p className="text-sm font-semibold text-zinc-900">{form.title || 'Untitled project'}</p>
            {clientSummary && (
              <p className="mt-1 text-xs text-zinc-600">{clientSummary}</p>
            )}
            <button
              type="button"
              onClick={() => setEditClientDetails(v => !v)}
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
            >
              {editClientDetails ? 'Hide client details' : 'Change client details'}
              {editClientDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {editClientDetails && (
              <div className="mt-3 space-y-3 border-t border-zinc-200/80 pt-3">
                <Input label="Project name" value={form.title} onChange={e => set('title', e.target.value)} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    label="Type"
                    placeholder="Select type"
                    options={CONTENT_TYPES.map(t => ({ value: t, label: t }))}
                    value={form.content_type}
                    onChange={e => set('content_type', e.target.value)}
                  />
                  {isZerodha && (
                    <Select
                      label="Language"
                      placeholder="Select language"
                      options={VIDEO_LANGUAGES.map(l => ({ value: l, label: l }))}
                      value={form.video_language}
                      onChange={e => set('video_language', e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </SlideOverSection>

        <SlideOverSection title="Production setup">
          <Input
            label="IP"
            placeholder="Enter IP"
            value={form.ip}
            onChange={e => set('ip', e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Level"
              placeholder={isZerodha && !form.video_language ? 'Select language first' : 'Select level'}
              options={levelOptions}
              value={form.level_of_video}
              onChange={e => set('level_of_video', e.target.value)}
            />
            <Select
              label="Priority (optional)"
              placeholder="Not set"
              options={[
                { value: '', label: 'Not set' },
                ...PRIORITIES.map(p => ({ value: p, label: p })),
              ]}
              value={form.priority}
              onChange={e => set('priority', e.target.value)}
            />
          </div>
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
            {isZerodha && (
              <UserSearchSelect
                label="Draft QC reviewer"
                users={users}
                value={form.qc_reviewer_id}
                onChange={v => set('qc_reviewer_id', v)}
              />
            )}
          </div>
        </SlideOverSection>

        <SlideOverSection title="Review link">
          <Input
            label="Review link"
            placeholder="https://..."
            value={form.assets_link}
            onChange={e => set('assets_link', e.target.value)}
          />
        </SlideOverSection>
      </div>
    </SlideOver>
  )
}
