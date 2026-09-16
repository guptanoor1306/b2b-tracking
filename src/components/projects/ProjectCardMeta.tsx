import { cn } from '@/lib/utils'
import { getIpAccent } from '@/lib/design/theme-v2'

/** Board card meta: IP, then language (Zerodha), then type — dot-separated, no chips. */
export function ProjectCardMeta({
  ip,
  contentType,
  videoLanguage,
  showLanguage,
  className,
}: {
  ip: string
  contentType?: string | null
  videoLanguage?: string | null
  showLanguage?: boolean
  className?: string
}) {
  const secondary = [
    showLanguage ? videoLanguage?.trim() || null : null,
    contentType?.trim() || null,
  ].filter(Boolean) as string[]

  return (
    <p className={cn('text-xs mt-1 min-w-0 truncate font-medium text-zinc-500', className)}>
      <span className="inline-flex items-center gap-1.5 text-zinc-600">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', getIpAccent(ip).bg)} />
        <span className="truncate">{ip}</span>
      </span>
      {secondary.length > 0 && (
        <>
          <span className="text-zinc-300"> · </span>
          <span className="font-normal text-zinc-400">{secondary.join(' · ')}</span>
        </>
      )}
    </p>
  )
}
