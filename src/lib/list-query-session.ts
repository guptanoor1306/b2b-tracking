const STORAGE_PREFIX = 'b2b-list-query:'

export type ListQueryPath = '/board' | '/dashboard'

function storageKey(path: ListQueryPath, channelSlug: string): string {
  return `${STORAGE_PREFIX}${channelSlug || '_'}:${path}`
}

/** Drop pre–channel-scoped keys so filters do not leak across channels. */
export function removeLegacyListQueryKeys() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}/board`)
    sessionStorage.removeItem(`${STORAGE_PREFIX}/dashboard`)
  } catch {
    /* ignore */
  }
}

export function saveListQuery(path: ListQueryPath, channelSlug: string, query: string) {
  if (typeof window === 'undefined') return
  try {
    const key = storageKey(path, channelSlug)
    if (query) sessionStorage.setItem(key, query)
    else sessionStorage.removeItem(key)
    window.dispatchEvent(new Event('list-query-updated'))
  } catch {
    /* ignore */
  }
}

export function readListQuery(path: ListQueryPath, channelSlug: string): string {
  if (typeof window === 'undefined') return ''
  try {
    return sessionStorage.getItem(storageKey(path, channelSlug)) ?? ''
  } catch {
    return ''
  }
}

export function clearAllListQueries() {
  if (typeof window === 'undefined') return
  try {
    const toRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) toRemove.push(key)
    }
    toRemove.forEach(k => sessionStorage.removeItem(k))
    window.dispatchEvent(new Event('list-query-updated'))
  } catch {
    /* ignore */
  }
}

export function hrefWithStoredListQuery(path: ListQueryPath, channelSlug: string): string {
  const q = readListQuery(path, channelSlug)
  return q ? `${path}?${q}` : path
}
