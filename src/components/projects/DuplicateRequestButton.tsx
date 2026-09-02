'use client'

import { useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ExternalRequestModal, type ExternalRequestFormValues } from '@/components/board/ExternalRequestModal'
import { Project } from '@/lib/types'
import { isCashAndCopiumChannelDbName } from '@/lib/external-intake-flow'

type Props = {
  project: Project
}

function projectToFormValues(project: Project): Partial<ExternalRequestFormValues> {
  const base: Partial<ExternalRequestFormValues> = {
    title: project.title,
    content_type: project.content_type ?? '',
    drive_link: project.drive_link ?? '',
    thumbnail_copy: project.thumbnail_copy ?? '',
    target_delivery_date: project.target_delivery_date ?? '',
  }
  if (isCashAndCopiumChannelDbName(project.channel)) {
    return {
      ...base,
      reel_timestamps: project.reel_timestamps?.length
        ? project.reel_timestamps
        : [{ start: '', end: '' }, { start: '', end: '' }],
    }
  }
  return {
    ...base,
    script_link: project.script_link ?? '',
    screen_captures_link: project.screen_captures_link ?? '',
    audio_link: project.audio_link ?? '',
    video_language: project.video_language ?? '',
  }
}

export function DuplicateRequestButton({ project }: Props) {
  const [open, setOpen] = useState(false)
  const initialValues = useMemo(() => projectToFormValues(project), [project])

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="v2-btn-secondary h-7 text-xs px-2"
      >
        <Copy size={11} /> Duplicate request
      </Button>
      <ExternalRequestModal
        open={open}
        onClose={() => setOpen(false)}
        initialValues={initialValues}
        title="Duplicate production request"
        submitLabel="Create duplicate"
        description="Pre-filled from this project. Edit any field and submit to create a new request."
      />
    </>
  )
}
