import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</label>}
      <select
        ref={ref}
        {...props}
        className={cn(
          'block w-full rounded-md border border-white/[0.08] bg-[#141414] px-3 py-2 text-sm text-zinc-100',
          'focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/20',
          error && 'border-rose-500/50',
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'
