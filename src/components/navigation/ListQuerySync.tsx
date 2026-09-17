'use client'

import { Suspense, useEffect } from 'react'
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

  useEffect(() => {
    removeLegacyListQueryKeys()
  }, [])

  useEffect(() => {
    if (!channelSlug || (pathname !== '/board' && pathname !== '/dashboard')) return
    const path = pathname as ListQueryPath
    const stored = readListQuery(path, channelSlug)
    if (!stored) return
    if (searchParams.toString()) return
    router.replace(`${path}?${stored}`)
  }, [channelSlug, pathname, router, searchParams])

  useEffect(() => {
    if (!channelSlug || !LIST_PATHS.has(pathname)) return
    const path = pathname as ListQueryPath
    saveListQuery(path, channelSlug, searchParams.toString())
  }, [channelSlug, pathname, searchParams])

  return null
}

export function ListQuerySync() {
  return (
    <Suspense fallback={null}>
      <ListQuerySyncInner />
    </Suspense>
  )
}
