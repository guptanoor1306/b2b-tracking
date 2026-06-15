import { StageHistory } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Props = {
  history: StageHistory[]
  currentStage: string
  compact?: boolean
}

export function StageMiniTimeline({ history, currentStage, compact }: Props) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  )

  if (sorted.length === 0) {
    return (
      <p className="text-[10px] text-zinc-600 mt-2">
        Current · {currentStage}
      </p>
    )
  }

  const visible = compact && sorted.length > 4 ? sorted.slice(-4) : sorted
  const skipped = compact && sorted.length > 4 ? sorted.length - 4 : 0

  return (
    <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1">
      <p className="text-[9px] uppercase tracking-wider text-zinc-600 mb-1">Stage timeline</p>
      {skipped > 0 && (
        <p className="text-[10px] text-zinc-600 pl-2">+{skipped} earlier…</p>
      )}
      {visible.map((item, i) => {
        const isCurrent = i === visible.length - 1 && item.new_stage === currentStage
        return (
          <div
            key={item.id}
            className={cn(
              'flex items-start gap-1.5 text-[10px] leading-snug pl-1 border-l-2',
              isCurrent
                ? 'border-indigo-400 text-zinc-200'
                : 'border-zinc-700 text-zinc-500'
            )}
          >
            <span className="shrink-0 text-zinc-600 w-[52px]">
              {formatDate(item.changed_at, 'dd MMM')}
            </span>
            <span className="min-w-0">
              {item.old_stage ? (
                <>
                  <span className="text-zinc-600">{item.old_stage}</span>
                  <span className="text-zinc-700 mx-0.5">→</span>
                </>
              ) : null}
              <span className={isCurrent ? 'text-indigo-300 font-medium' : ''}>{item.new_stage}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
