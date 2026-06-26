'use client'

import { ReactNode, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

type SlideOverProps = {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  width?: 'md' | 'lg' | 'xl'
}

const widths = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

export function SlideOver({
  open, onClose, title, subtitle, children, footer, width = 'lg',
}: SlideOverProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-zinc-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          'fixed inset-y-0 right-0 flex w-full flex-col border-l border-zinc-200 bg-white shadow-2xl',
          widths[width]
        )}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between border-b border-zinc-200 px-6 py-4">
          <div className="min-w-0 pr-4">
            {title && <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-zinc-200 bg-zinc-50/80 px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

export function SlideOverSection({
  title, children, className,
}: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      {children}
    </section>
  )
}
