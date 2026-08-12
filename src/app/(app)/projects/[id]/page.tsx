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
  canReviewExternalRequest,
  canEditIntakeMaterials,
  canCreateExternalRequest,
  canSubmitClientReviewFeedback,
  canSubmitQcReviewFeedback,
  canResubmitDeclinedRequest,
} from '@/lib/views'
import { fetchClientReviewSubmissions } from '@/lib/data/client-review-feedback'
import { fetchQcReviewSubmissions, fetchCurrentQcSubmission } from '@/lib/data/qc-review-feedback'
import { isZerodhaChannelDbName } from '@/lib/zerodha-sla'
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
  const isZerodha = isZerodhaChannelDbName(project.channel)
  const [history, channelMembers, commentsRes, holidays, stageSla, holdPeriods, rpCuts, clientReviewSubmissions, qcSubmissions, currentQcSubmission] = await Promise.all([
    fetchProjectStageHistory(id, project),
    channelSlug ? fetchChannelMembers(channelSlug) : Promise.resolve([]),
    supabase.from('comments').select('*, author:profiles!comments_created_by_fkey(id, name, email)').eq('project_id', id).order('created_at', { ascending: true }),
    fetchHolidayDates(),
    fetchStageSlaConfig(channelName),
    fetchProjectHoldPeriods(id),
    canViewRpCuts(role) ? fetchRpCuts(id) : Promise.resolve([]),
    isZerodha ? fetchClientReviewSubmissions(id) : Promise.resolve([]),
    isZerodha && pipelineInternal ? fetchQcReviewSubmissions(id) : Promise.resolve([]),
    isZerodha && pipelineInternal ? fetchCurrentQcSubmission(id) : Promise.resolve(null),
  ])
  setStageSlaCache(stageSla, channelName)

  const users = canManageProject ? channelMembers : []
  const graphicsDesigners = users.filter(u => u.name.toLowerCase().includes('amit'))
  const displayStage = pipelineInternal
    ? project.current_stage
    : mapInternalToExternalStage(project.current_stage, project.channel)

  return (
    <ProjectDetailLayout
      project={project}
      displayStage={displayStage}
      internal={pipelineInternal}
      canEdit={canEditProjects(role)}
      canEditLinks={canEditProjectLinks(role)}
      canEditCopy={canEditProjectCopy(role)}
      canEditIntakeMaterials={canEditIntakeMaterials(role, project, profile.id)}
      canViewRpCuts={canViewRpCuts(role)}
      canEditRpCuts={canEditRpCuts(role)}
      canSendReminder={canSendStageReminder(role)}
      canReviewRequest={canReviewExternalRequest(role, channelName)}
      canResubmitRequest={canResubmitDeclinedRequest(role, project, profile.id)}
      canDuplicateRequest={canCreateExternalRequest(role, channelName)}
      holidays={holidays}
      users={users}
      graphicsDesigners={graphicsDesigners.length ? graphicsDesigners : users}
      history={history}
      holdPeriods={holdPeriods}
      comments={(commentsRes.data ?? []) as Comment[]}
      rpCuts={rpCuts}
      clientReviewSubmissions={clientReviewSubmissions}
      canSubmitClientReview={canSubmitClientReviewFeedback(role, project, profile.id)}
      qcSubmissions={qcSubmissions}
      currentQcSubmission={currentQcSubmission}
      canSubmitQcReview={canSubmitQcReviewFeedback(role, project, profile.id)}
    />
  )
}
