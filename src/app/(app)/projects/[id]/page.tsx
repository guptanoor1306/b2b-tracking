import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchProjectById } from '@/lib/data/projects'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { ProjectDetailLayout } from '@/components/projects/ProjectDetailLayout'
import {
  isInternalRole,
  mapInternalToExternalStage,
  canEditProjects,
  canSendStageReminder,
} from '@/lib/views'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { ArrowLeft } from 'lucide-react'
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
  const [historyRes, usersRes, commentsRes, holidays] = await Promise.all([
    supabase
      .from('stage_history')
      .select('*, assignee:profiles!stage_history_assignee_id_fkey(id, name, email)')
      .eq('project_id', id)
      .order('changed_at', { ascending: true }),
    supabase.from('profiles').select('*').eq('is_active', true).order('name'),
    supabase.from('comments').select('*, author:profiles!comments_created_by_fkey(id, name, email)').eq('project_id', id).order('created_at', { ascending: true }),
    fetchHolidayDates(),
  ])

  const users = usersRes.data ?? []
  const graphicsDesigners = users.filter(u => u.name.toLowerCase().includes('amit'))
  const internal = isInternalRole(profile.role)
  const displayStage = internal ? project.current_stage : mapInternalToExternalStage(project.current_stage)

  return (
    <div className="space-y-4 max-w-5xl">
      <Link href="/board" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-indigo-400 transition-colors">
        <ArrowLeft size={14} /> Back to board
      </Link>

      <ProjectDetailLayout
        project={project}
        displayStage={displayStage}
        internal={internal}
        canEdit={canEditProjects(profile.role)}
        canSendReminder={canSendStageReminder(profile.role)}
        holidays={holidays}
        users={users}
        graphicsDesigners={graphicsDesigners.length ? graphicsDesigners : users}
        history={historyRes.data ?? []}
        comments={(commentsRes.data ?? []) as Comment[]}
      />
    </div>
  )
}
