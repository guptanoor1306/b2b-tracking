'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteProject } from '@/lib/actions/projects'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Trash2 } from 'lucide-react'

type Props = { projectId: string; projectTitle: string }

export function DeleteProjectButton({ projectId, projectTitle }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setLoading(true)
    setError('')
    const result = await deleteProject(projectId)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setOpen(false)
    router.push('/board')
    router.refresh()
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 size={14} /> Delete
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete project" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Delete <span className="text-zinc-200 font-medium">{projectTitle}</span>? This cannot be undone.
          </p>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={loading} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
