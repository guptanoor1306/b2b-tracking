'use client'

import { useEffect, useState } from 'react'
import { hrefWithStoredListQuery, type ListQueryPath } from '@/lib/list-query-session'
import { useActiveChannel } from '@/context/ChannelContext'

export function useStoredListHref(path: ListQueryPath): string {
  const channelSlug = useActiveChannel()?.slug ?? ''
  const [href, setHref] = useState<string>(path)

  useEffect(() => {
    if (!channelSlug) {
      setHref(path)
      return
    }
    const refresh = () => setHref(hrefWithStoredListQuery(path, channelSlug))
    refresh()
    window.addEventListener('list-query-updated', refresh)
    return () => window.removeEventListener('list-query-updated', refresh)
  }, [path, channelSlug])

  return href
}
