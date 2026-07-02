import { notFound, redirect } from 'next/navigation'
import { fetchProjectById } from '@/lib/data/projects'
import { fetchRpCuts } from '@/lib/data/rp-cuts'
import { fetchChannelMembers } from '@/lib/data/channel-access'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelRole, getActiveChannelDbName, getActiveChannelSlug } from '@/lib/channel-context'
import { ProjectDetailLayout } from '@/components/projects/ProjectDetailLayout'
import {
  isInternalRole,
  usesInternalPipelineView,
  mapInternalToExternalStage,
  canEditProjects,
  canSendStageReminder,
  effectiveRoleForChannel,
  canEditProjectLinks,
  canEditProjectCopy,
  canViewRpCuts,
  canEditRpCuts,
} from '@/lib/views'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { fetchStageSlaConfig, fetchProjectHoldPeriods } from '@/lib/data/stage-sla'
import { fetchProjectStageHistory } from '@/lib/data/stage-history'
import { setStageSlaCache } from '@/lib/timelines'
import { Comment } from '@/lib/types'

type Params = Promise<{ id: string }>

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  let project
  try {
    project = await fetchProjectById(id)
  } catch {
    notFound()
  }

  const supabase = await createClient()
  const channelRole = await getActiveChannelRole(profile)
  const role = effectiveRoleForChannel(channelRole, profile.role)
  const pipelineInternal = usesInternalPipelineView(role)
  const canManageProject = isInternalRole(role)

  const channelName = await getActiveChannelDbName()
  const channelSlug = await getActiveChannelSlug()
  const [history, channelMembers, commentsRes, holidays, stageSla, holdPeriods, rpCuts] = await Promise.all([
    fetchProjectStageHistory(id, project),
    channelSlug ? fetchChannelMembers(channelSlug) : Promise.resolve([]),
    supabase.from('comments').select('*, author:profiles!comments_created_by_fkey(id, name, email)').eq('project_id', id).order('created_at', { ascending: true }),
    fetchHolidayDates(),
    fetchStageSlaConfig(channelName),
    fetchProjectHoldPeriods(id),
    canViewRpCuts(role) ? fetchRpCuts(id) : Promise.resolve([]),
  ])
  setStageSlaCache(stageSla, channelName)

  const users = canManageProject ? channelMembers : []
  const graphicsDesigners = users.filter(u => u.name.toLowerCase().includes('amit'))
  const displayStage = pipelineInternal ? project.current_stage : mapInternalToExternalStage(project.current_stage)

  return (
    <ProjectDetailLayout
      project={project}
      displayStage={displayStage}
      internal={pipelineInternal}
      canEdit={canEditProjects(role)}
      canEditLinks={canEditProjectLinks(role)}
      canEditCopy={canEditProjectCopy(role)}
      canViewRpCuts={canViewRpCuts(role)}
      canEditRpCuts={canEditRpCuts(role)}
      canSendReminder={canSendStageReminder(role)}
      holidays={holidays}
      users={users}
      graphicsDesigners={graphicsDesigners.length ? graphicsDesigners : users}
      history={history}
      holdPeriods={holdPeriods}
      comments={(commentsRes.data ?? []) as Comment[]}
      rpCuts={rpCuts}
    />
  )
}
