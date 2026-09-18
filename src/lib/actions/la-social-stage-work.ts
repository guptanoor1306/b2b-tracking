'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { canEditProjects, effectiveRoleForChannel } from '@/lib/views'
import { getActiveChannelRole } from '@/lib/channel-context'
import { isLaSocialChannelDbName } from '@/lib/la-social-sla'
import { revalidateProjectsListCache } from '@/lib/revalidate-project-list'

export async function endOpenStageWorkSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  endedBy: string,
) {
  const now = new Date().toISOString()
  await supabase
    .from('project_stage_work_sessions')
    .update({ ended_at: now, ended_by: endedBy })
    .eq('project_id', projectId)
    .is('ended_at', null)
}

export async function startLaSocialStageWork(projectId: string): Promise<{ error?: string; success?: boolean }> {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }

  const channelRole = await getActiveChannelRole(profile)
  const role = effectiveRoleForChannel(channelRole, profile.role)
  if (!canEditProjects(role)) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('id, channel, current_stage').eq('id', projectId).single()
  if (!project) return { error: 'Project not found' }
  if (!isLaSocialChannelDbName(project.channel)) return { error: 'Not an LA Social project' }

  const stage = project.current_stage
  if (!stage?.trim()) return { error: 'No active stage' }

  const { data: existing } = await supabase
    .from('project_stage_work_sessions')
    .select('id, stage_name')
    .eq('project_id', projectId)
    .is('ended_at', null)
    .maybeSingle()

  if (existing?.stage_name === stage) {
    return { success: true }
  }

  await endOpenStageWorkSessions(supabase, projectId, profile.id)

  const { error } = await supabase.from('project_stage_work_sessions').insert({
    project_id: projectId,
    stage_name: stage,
    started_by: profile.id,
  })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/board')
  revalidatePath('/dashboard')
  revalidateProjectsListCache(project.channel)
  return { success: true }
}
