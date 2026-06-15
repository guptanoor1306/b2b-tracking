import { STAGE_PIPELINE } from '@/lib/constants'
import { formatWaitingSince } from '@/lib/utils'
import { normalizeStage } from '@/lib/timelines'
import { mapInternalToExternalStage } from '@/lib/views'
import { Building2, Users, CheckCircle2 } from 'lucide-react'

type Props = {
  currentStage: string
  since: string
  externalView?: boolean
  compact?: boolean
}

export function PipelineStatusBanner({ currentStage, since, externalView, compact }: Props) {
  const displayStage = externalView ? mapInternalToExternalStage(currentStage) : currentStage
  const pipeline = STAGE_PIPELINE[normalizeStage(currentStage)] ?? STAGE_PIPELINE[normalizeStage(displayStage)]
  if (!pipeline) return null

  const waiting = formatWaitingSince(since)

  if (pipeline.owner === 'none') {
    return (
      <div className={`rounded-lg border flex items-center gap-2 ${compact ? 'px-3 py-2' : 'p-4'} border-emerald-200 bg-emerald-50`}>
        <CheckCircle2 size={compact ? 14 : 20} className="text-emerald-600 shrink-0" />
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-zinc-800`}>{pipeline.label}</p>
      </div>
    )
  }

  const isExternal = pipeline.owner === 'external'
  const ownerLabel = isExternal ? 'Client' : 'LearnApp'

  if (compact) {
    return (
      <div className={`rounded-lg border px-3 py-2 flex items-center gap-2 text-xs ${
        isExternal ? 'border-amber-200 bg-amber-50' : 'border-violet-200 bg-violet-50'
      }`}>
        {isExternal ? (
          <Building2 size={13} className="text-amber-700 shrink-0" />
        ) : (
          <Users size={13} className="text-violet-700 shrink-0" />
        )}
        <span className="text-zinc-500">{externalView ? displayStage : `Waiting on ${ownerLabel}`}</span>
        <span className="text-zinc-800 font-medium truncate">{pipeline.label}</span>
        <span className="text-zinc-500 ml-auto shrink-0">{waiting}</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        isExternal
          ? 'border-amber-200 bg-amber-50'
          : 'border-violet-200 bg-violet-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isExternal ? 'bg-amber-100' : 'bg-violet-100'}`}>
          {isExternal ? (
            <Building2 size={16} className="text-amber-700" />
          ) : (
            <Users size={16} className="text-violet-700" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5 font-medium">
            {externalView ? `Stage · ${displayStage}` : `Waiting on · ${ownerLabel}`}
          </p>
          <p className="text-sm font-medium text-zinc-900">{pipeline.label}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            In this stage for <span className="text-zinc-700 font-medium">{waiting}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
