'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Project, Agency, Profile } from '@/lib/types'
import { ProjectFilters } from './ProjectFilters'
import { ProjectsTable } from './ProjectsTable'

type Props = {
  projects: Project[]
  agencies: Agency[]
  owners: Profile[]
  editors: string[]
  canEdit?: boolean
}

export function DashboardClient({ projects, agencies, owners, editors, canEdit = true }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const filters: Record<string, string> = {
    ip: searchParams.get('ip') ?? '',
    content_type: searchParams.get('content_type') ?? '',
    current_stage: searchParams.get('current_stage') ?? '',
    status_health: searchParams.get('status_health') ?? '',
    editor: searchParams.get('editor') ?? '',
    agency: searchParams.get('agency') ?? '',
    owner: searchParams.get('owner') ?? '',
    month: searchParams.get('month') ?? '',
  }

  const onChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <ProjectFilters filters={filters} onChange={onChange} agencies={agencies} owners={owners} editors={editors} />
      <ProjectsTable projects={projects} canEdit={canEdit} />
    </div>
  )
}
