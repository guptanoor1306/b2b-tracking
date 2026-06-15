'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from '@/lib/types'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { updateProject } from '@/lib/actions/projects'
import { AlertCircle } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  project: Project
}

export function ExternalProjectEditModal({ open, onClose, project }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    drive_link: project.drive_link ?? '',
    assets_link: project.assets_link ?? '',
    title_copy: project.title_copy ?? '',
    thumbnail_copy: project.thumbnail_copy ?? '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const missing = [
    !form.assets_link.trim() && 'Asset link',
    !form.title_copy.trim() && 'Title copy',
    !form.thumbnail_copy.trim() && 'Thumbnail copy',
    !form.drive_link.trim() && 'Drive / video link',
  ].filter(Boolean) as string[]

  const handleSave = async () => {
    setLoading(true)
    await updateProject(project.id, {
      drive_link: form.drive_link.trim() || null,
      assets_link: form.assets_link.trim() || null,
      title_copy: form.title_copy.trim() || null,
      thumbnail_copy: form.thumbnail_copy.trim() || null,
    })
    setLoading(false)
    onClose()
    router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title="Update project details" size="md">
      <div className="space-y-3">
        {missing.length > 0 && (
          <div className="flex gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
            <AlertCircle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-300">Please add the following</p>
              <p className="text-[11px] text-amber-400/80 mt-0.5">{missing.join(' · ')}</p>
            </div>
          </div>
        )}
        <Input label="Asset link" placeholder="Paste asset folder or file link" value={form.assets_link} onChange={e => set('assets_link', e.target.value)} />
        <Input label="Drive / video link" placeholder="Paste drive or video link" value={form.drive_link} onChange={e => set('drive_link', e.target.value)} />
        <Textarea label="Title copy" placeholder="Paste or write title copy" value={form.title_copy} onChange={e => set('title_copy', e.target.value)} />
        <Textarea label="Thumbnail copy" placeholder="Paste or write thumbnail text" value={form.thumbnail_copy} onChange={e => set('thumbnail_copy', e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  )
}
