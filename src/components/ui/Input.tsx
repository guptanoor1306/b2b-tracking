import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-zinc-600">{label}</label>}
      <input
        ref={ref}
        {...props}
        className={cn(
          'block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400',
          'focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10',
          error && 'border-red-300',
          className
        )}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
