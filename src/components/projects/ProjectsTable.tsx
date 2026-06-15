'use client'

import Link from 'next/link'
import { Project } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { Eye, Pencil } from 'lucide-react'

type Props = {
  projects: Project[]
  showActions?: boolean
  canEdit?: boolean
}

export function ProjectsTable({ projects, showActions = true, canEdit = true }: Props) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-gray-500 bg-white rounded-xl border border-gray-200">
        No projects found.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Content ID</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Health</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Agency / Editor</th>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Last Updated</th>
              <th className="px-4 py-3 font-medium">Next Action</th>
              {showActions && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-indigo-600">{p.content_id}</td>
                <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{p.title}</td>
                <td className="px-4 py-3 text-gray-600">{p.ip}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{p.content_type}</td>
                <td className="px-4 py-3"><Badge label={p.current_stage} variant="stage" /></td>
                <td className="px-4 py-3"><Badge label={p.status_health} variant="health" /></td>
                <td className="px-4 py-3 text-gray-600">{p.owner?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {p.agency?.name ?? '—'}{p.editor ? ` / ${p.editor}` : ''}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(p.received_date)}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(p.target_delivery_date)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.last_status_update_at, 'dd MMM yyyy HH:mm')}</td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-[140px] truncate">{p.next_action ?? '—'}</td>
                {showActions && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/projects/${p.id}`} className="text-gray-400 hover:text-indigo-600">
                        <Eye size={15} />
                      </Link>
                      {canEdit && (
                        <Link href={`/projects/${p.id}/edit`} className="text-gray-400 hover:text-indigo-600">
                          <Pencil size={15} />
                        </Link>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
