import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-zinc-400">{label}</label>}
      <textarea
        ref={ref}
        rows={3}
        {...props}
        className={cn(
          'block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 resize-y',
          'focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30',
          error && 'border-rose-500/50',
          className
        )}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
