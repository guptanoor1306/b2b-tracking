'use client'

import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ReleaseScheduleModal, type ReleaseScheduleItem } from '@/components/dashboard/ReleaseScheduleModal'

type Props = {
  items: ReleaseScheduleItem[]
}

export function ReleaseScheduleButton({ items }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="v2-btn-secondary shrink-0 font-semibold"
      >
        <CalendarDays size={16} /> Release Schedule
      </Button>
      <ReleaseScheduleModal open={open} onClose={() => setOpen(false)} items={items} />
    </>
  )
}
