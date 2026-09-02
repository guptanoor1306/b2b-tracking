export const HOLIDAYS_CACHE_TAG = 'org-holidays'

export function stageSlaCacheTag(channelKey: string) {
  return `stage-sla:${channelKey}`
}

export function channelMembersCacheTag(channelSlug: string) {
  return `channel-members:${channelSlug}`
}
