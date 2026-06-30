import { notFound, redirect } from 'next/navigation'
import { fetchProjectById } from '@/lib/data/projects'
import { fetchRpCuts } from '@/lib/data/rp-cuts'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelRole } from '@/lib/channel-context'
import { ProjectDetailLayout } from '@/components/projects/ProjectDetailLayout'
import {
  isInternalRole,
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
  const internal = isInternalRole(role)

  const [historyRes, usersRes, commentsRes, holidays, stageSla, holdPeriods, rpCuts] = await Promise.all([
    supabase
      .from('stage_history')
      .select('*, assignee:profiles!stage_history_assignee_id_fkey(id, name, email)')
      .eq('project_id', id)
      .order('changed_at', { ascending: true }),
    internal
      ? supabase.from('profiles').select('*').eq('is_active', true).order('name')
      : Promise.resolve({ data: [] }),
    supabase.from('comments').select('*, author:profiles!comments_created_by_fkey(id, name, email)').eq('project_id', id).order('created_at', { ascending: true }),
    fetchHolidayDates(),
    fetchStageSlaConfig(),
    fetchProjectHoldPeriods(id),
    canViewRpCuts(role) ? fetchRpCuts(id) : Promise.resolve([]),
  ])
  setStageSlaCache(stageSla)

  const users = usersRes.data ?? []
  const graphicsDesigners = users.filter(u => u.name.toLowerCase().includes('amit'))
  const displayStage = internal ? project.current_stage : mapInternalToExternalStage(project.current_stage)

  return (
    <ProjectDetailLayout
      project={project}
      displayStage={displayStage}
      internal={internal}
      canEdit={canEditProjects(role)}
      canEditLinks={canEditProjectLinks(role)}
      canEditCopy={canEditProjectCopy(role)}
      canViewRpCuts={canViewRpCuts(role)}
      canEditRpCuts={canEditRpCuts(role)}
      canSendReminder={canSendStageReminder(role)}
      holidays={holidays}
      users={users}
      graphicsDesigners={graphicsDesigners.length ? graphicsDesigners : users}
      history={historyRes.data ?? []}
      holdPeriods={holdPeriods}
      comments={(commentsRes.data ?? []) as Comment[]}
      rpCuts={rpCuts}
    />
  )
}
