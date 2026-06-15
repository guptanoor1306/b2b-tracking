import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: number | string
  icon?: LucideIcon
  color?: string
  sub?: string
}

export function StatCard({ label, value, icon: Icon, color = 'text-indigo-600', sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm">
      {Icon && (
        <div className={cn('p-2 rounded-lg bg-gray-50', color)}>
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
