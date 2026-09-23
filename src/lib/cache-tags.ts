export const HOLIDAYS_CACHE_TAG = 'org-holidays'

export function stageSlaCacheTag(channelKey: string) {
  return `stage-sla:${channelKey}`
}

export function channelMembersCacheTag(channelSlug: string) {
  return `channel-members:${channelSlug}`
}

export function projectsListCacheTag(channelDbName: string) {
  return `projects-list:${channelDbName}`
}

export const STUDIOS_HUB_PROJECTS_CACHE_TAG = 'studios-hub-projects'

export const CHANNEL_MEMBER_COUNTS_CACHE_TAG = 'channel-member-counts'
