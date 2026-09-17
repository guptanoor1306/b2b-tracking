'use client'

import { Suspense, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  readListQuery,
  removeLegacyListQueryKeys,
  saveListQuery,
  type ListQueryPath,
} from '@/lib/list-query-session'
import { useActiveChannel } from '@/context/ChannelContext'

const LIST_PATHS = new Set<string>(['/board', '/dashboard'])

function ListQuerySyncInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const channelSlug = useActiveChannel()?.slug ?? ''
  /** True once this channel+path visit had URL query params (user changed filters). */
  const hadQueryOnVisitRef = useRef(false)

  useEffect(() => {
    removeLegacyListQueryKeys()
  }, [])

  useEffect(() => {
    hadQueryOnVisitRef.current = false
  }, [channelSlug, pathname])

  useEffect(() => {
    if (!channelSlug || !LIST_PATHS.has(pathname)) return
    const path = pathname as ListQueryPath
    const qs = searchParams.toString()

    if (qs) {
      hadQueryOnVisitRef.current = true
      saveListQuery(path, channelSlug, qs)
      return
    }

    // Bare URL: user cleared filters — do not re-apply stale session storage.
    if (hadQueryOnVisitRef.current) {
      saveListQuery(path, channelSlug, '')
      return
    }

    // First paint on path with no query — restore last session filters for this channel.
    const stored = readListQuery(path, channelSlug)
    if (stored) {
      router.replace(`${path}?${stored}`)
      return
    }
    saveListQuery(path, channelSlug, '')
  }, [channelSlug, pathname, router, searchParams])

  return null
}

export function ListQuerySync() {
  return (
    <Suspense fallback={null}>
      <ListQuerySyncInner />
    </Suspense>
  )
}
