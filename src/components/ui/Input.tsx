import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</label>}
      <input
        ref={ref}
        {...props}
        className={cn(
          'block w-full rounded-md border border-white/[0.08] bg-[#141414] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600',
          'focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20',
          'disabled:opacity-50',
          error && 'border-rose-500/50',
          className
        )}
      />
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
