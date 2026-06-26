'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { QuickAddModal } from '@/components/board/QuickAddModal'

type Props = {
  users: Profile[]
  holidays?: string[]
}

export function BoardHeaderActions({ users, holidays = [] }: Props) {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setAddOpen(true)} className="v2-btn-primary shrink-0 font-semibold">
        <Plus size={14} /> Add project
      </Button>
      <QuickAddModal open={addOpen} onClose={() => setAddOpen(false)} users={users} holidays={holidays} />
    </>
  )
}
