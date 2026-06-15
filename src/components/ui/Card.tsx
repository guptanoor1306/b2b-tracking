import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: 'emerald' | 'rose' | 'indigo' | 'amber' | null
}

export function Card({ children, className, hover = false, glow = null }: Props) {
  return (
    <div
      className={cn(
        hover ? 'glow-card' : 'glow-card-static',
        glow === 'emerald' && 'stat-glow-emerald',
        glow === 'rose' && 'stat-glow-rose',
        glow === 'indigo' && 'stat-glow-indigo',
        glow === 'amber' && 'stat-glow-rose',
        className
      )}
    >
      {children}
    </div>
  )
}
