'use client'

import { ReactNode, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            'relative panel w-full p-6 border-indigo-500/15',
            sizes[size]
          )}
          onClick={e => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X size={18} />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
