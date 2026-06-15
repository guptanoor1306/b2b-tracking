'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'
import { ROLES, ROLE_LABELS } from '@/lib/constants'
import { createUser, updateUser, deleteUser } from '@/lib/actions/users'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { formatDate, cn } from '@/lib/utils'
import { UserPlus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

type Props = { users: Profile[]; currentUserId?: string }

type SortBy = 'name' | 'created'

const PAGE_SIZE = 10

export function UsersClient({ users, currentUserId }: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('created')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'Internal Team', organization: '',
  })

  const sorted = useMemo(() => {
    const list = [...users]
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return list
  }, [users, sortBy])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageUsers = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sorted.length)

  const setSort = (next: SortBy) => {
    setSortBy(next)
    setPage(1)
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    const result = await createUser(form)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setCreateOpen(false)
    setForm({ name: '', email: '', password: '', role: 'Internal Team', organization: '' })
    setPage(1)
    router.refresh()
  }

  const toggleActive = async (user: Profile) => {
    await updateUser(user.id, { is_active: !user.is_active })
    router.refresh()
  }

  const changeRole = async (user: Profile, role: string) => {
    await updateUser(user.id, { role })
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setError('')
    const result = await deleteUser(deleteTarget.id)
    setDeleteLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDeleteTarget(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Sort</span>
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setSort('created')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                sortBy === 'created'
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              Latest
            </button>
            <button
              type="button"
              onClick={() => setSort('name')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors border-l border-zinc-200',
                sortBy === 'name'
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-700'
              )}
            >
              Name A–Z
            </button>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus size={14} /> Create user
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-100 bg-zinc-50/80">
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Organization</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Created</th>
              <th className="px-4 py-3 text-left whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pageUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No users found.
                </td>
              </tr>
            ) : (
              pageUsers.map(u => (
                <tr key={u.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">{u.name}</td>
                  <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="text-xs bg-white border border-zinc-200 rounded-lg px-2 py-1 text-zinc-700 max-w-[140px]"
                      value={u.role}
                      onChange={e => changeRole(u, e.target.value)}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden lg:table-cell">{u.organization ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge
                      label={u.is_active ? 'Active' : 'Inactive'}
                      variant="custom"
                      className={u.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'}
                    />
                  </td>
                  <td className="px-4 py-3 text-zinc-600 text-xs hidden sm:table-cell">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      {currentUserId !== u.id ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => { setError(''); setDeleteTarget(u) }}
                          className="shrink-0"
                        >
                          <Trash2 size={13} />
                          Delete
                        </Button>
                      ) : (
                        <span className="text-[10px] text-zinc-400">You</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {rangeStart}–{rangeEnd} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-7 px-2"
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="tabular-nums px-2">
              {safePage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-7 px-2"
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create user">
        <div className="space-y-3">
          {error && !deleteTarget && <p className="text-sm text-red-600">{error}</p>}
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <Select
            label="Role"
            options={ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] ?? r }))}
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          />
          <Input
            label="Organization"
            placeholder="e.g. Studio Alpha"
            value={form.organization}
            onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={loading} onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete user">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Permanently delete <span className="font-semibold text-zinc-900">{deleteTarget?.name}</span>?
            This removes their account and cannot be undone.
          </p>
          {error && deleteTarget && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button loading={deleteLoading} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete user
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
