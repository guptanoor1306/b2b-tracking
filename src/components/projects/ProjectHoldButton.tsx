'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { toggleProjectHold } from '@/lib/actions/projects'
import { cn } from '@/lib/utils'

type Props = {
  projectId: string
  isOnHold: boolean
  className?: string
}

export function ProjectHoldButton({ projectId, isOnHold, className }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    const result = await toggleProjectHold(projectId)
    setLoading(false)
    if (!result.error) router.refresh()
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      loading={loading}
      onClick={handleClick}
      className={cn(
        'h-8',
        isOnHold
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
        className
      )}
    >
      {isOnHold ? <Play size={12} /> : <Pause size={12} />}
      {isOnHold ? 'Resume' : 'Hold'}
    </Button>
  )
}
