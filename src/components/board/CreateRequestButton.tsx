'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ExternalRequestModal } from '@/components/board/ExternalRequestModal'

export function CreateRequestButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="v2-btn-primary shrink-0 font-semibold"
      >
        <Plus size={16} /> Create request
      </Button>
      <ExternalRequestModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
