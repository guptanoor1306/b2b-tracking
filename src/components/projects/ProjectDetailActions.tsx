'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { StageSelectModal } from './StageChangeModal'
import { changeProjectStage } from '@/lib/actions/projects'
import { FINAL_STAGE } from '@/lib/constants'
import { Pencil, CheckCircle } from 'lucide-react'

type Props = {
  projectId: string
  currentStage: string
  canEdit: boolean
}

export function ProjectDetailActions({ projectId, currentStage, canEdit }: Props) {
  const router = useRouter()
  const [stageModalOpen, setStageModalOpen] = useState(false)

  const handleStageChange = async (stage: string, note: string) => {
    await changeProjectStage(projectId, stage, note)
    router.refresh()
  }

  const quickAction = async (stage: string) => {
    await changeProjectStage(projectId, stage)
    router.refresh()
  }

  if (!canEdit) return null

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/projects/${projectId}/edit`}>
        <Button variant="secondary" size="sm"><Pencil size={14} /> Edit</Button>
      </Link>
      <Button variant="secondary" size="sm" onClick={() => setStageModalOpen(true)}>Change Stage</Button>
      {currentStage !== FINAL_STAGE && (
        <Button size="sm" onClick={() => quickAction(FINAL_STAGE)}>
          <CheckCircle size={14} /> Mark delivered
        </Button>
      )}
      <StageSelectModal
        open={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        currentStage={currentStage}
        onConfirm={handleStageChange}
      />
    </div>
  )
}
