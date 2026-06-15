import { cn } from '@/lib/utils'
import { SelectHTMLAttributes, forwardRef } from 'react'

type Option = { value: string; label: string }

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  options: Option[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-zinc-600">{label}</label>}
      <select
        ref={ref}
        {...props}
        className={cn(
          'block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900',
          'focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/10',
          error && 'border-red-300',
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'
