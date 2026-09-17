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

    if (hadQueryOnVisitRef.current) {
      saveListQuery(path, channelSlug, '')
      return
    }

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
