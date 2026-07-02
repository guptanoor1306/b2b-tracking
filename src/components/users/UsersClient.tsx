'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChannelMember } from '@/lib/types'
import { CHANNEL_MEMBER_ROLES, ROLE_LABELS } from '@/lib/constants'
import {
  createChannelUser,
  updateChannelMember,
  removeChannelMemberFromChannel,
  deleteUser,
} from '@/lib/actions/users'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { formatDate, cn } from '@/lib/utils'
import { UserPlus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { SettingsPanel, SettingsCard, SettingsStat } from '@/components/settings/SettingsLayout'

type Props = {
  members: ChannelMember[]
  channelSlug: string
  channelName: string
  currentUserId?: string
  canManageRoles?: boolean
  embedded?: boolean
}

type SortBy = 'name' | 'created'

const PAGE_SIZE = 10

export function UsersClient({
  members, channelSlug, channelName, currentUserId, canManageRoles = false, embedded = false,
}: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ChannelMember | null>(null)
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('created')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'Channel Team', organization: '',
  })

  const sorted = useMemo(() => {
    const list = [...members]
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
    return list
  }, [members, sortBy])

  const activeCount = members.filter(u => u.is_active).length
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
    const result = await createChannelUser(form, form.role as ChannelMember['channel_role'], channelSlug)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setCreateOpen(false)
    setForm({ name: '', email: '', password: '', role: 'Channel Team', organization: '' })
    setPage(1)
    router.refresh()
  }

  const toggleActive = async (user: ChannelMember) => {
    await updateChannelMember(user.id, channelSlug, { is_active: !user.is_active })
    router.refresh()
  }

  const changeRole = async (user: ChannelMember, channelRole: string) => {
    await updateChannelMember(user.id, channelSlug, { channel_role: channelRole as ChannelMember['channel_role'] })
    router.refresh()
  }

  const handleRemove = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setError('')
    const result = canManageRoles
      ? await deleteUser(deleteTarget.id)
      : await removeChannelMemberFromChannel(deleteTarget.id, channelSlug)
    setDeleteLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setDeleteTarget(null)
    router.refresh()
  }

  const content = (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <SettingsStat label="Total users" value={members.length} />
        <SettingsStat label="Active" value={activeCount} />
        <SettingsStat label="Inactive" value={members.length - activeCount} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">Sort by</span>
          <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => setSort('created')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                sortBy === 'created'
                  ? 'bg-violet-50 text-violet-800'
                  : 'text-zinc-600 hover:bg-zinc-50'
              )}
            >
              Latest
            </button>
            <button
              type="button"
              onClick={() => setSort('name')}
              className={cn(
                'border-l border-zinc-200 px-3 py-1.5 text-sm font-medium transition-colors',
                sortBy === 'name'
                  ? 'bg-violet-50 text-violet-800'
                  : 'text-zinc-600 hover:bg-zinc-50'
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

      <SettingsCard padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Name</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Role</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 lg:table-cell">Organization</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Status</th>
                <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 sm:table-cell">Created</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pageUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                pageUsers.map(u => (
                  <tr key={u.id} className="transition-colors hover:bg-zinc-50/60">
                    <td className="px-4 py-3.5 font-medium text-zinc-900">{u.name}</td>
                    <td className="hidden px-4 py-3.5 text-zinc-600 md:table-cell">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <select
                        className="max-w-[160px] rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-700"
                        value={u.channel_role}
                        onChange={e => changeRole(u, e.target.value)}
                      >
                        {CHANNEL_MEMBER_ROLES.map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="hidden px-4 py-3.5 text-zinc-600 lg:table-cell">{u.organization ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <Badge
                        label={u.is_active ? 'Active' : 'Inactive'}
                        variant="custom"
                        className={u.is_active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-zinc-200 bg-zinc-100 text-zinc-500'}
                      />
                    </td>
                    <td className="hidden px-4 py-3.5 text-sm text-zinc-600 sm:table-cell">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        {currentUserId !== u.id ? (
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => { setError(''); setDeleteTarget(u) }}
                          >
                            <Trash2 size={13} />
                          </Button>
                        ) : (
                          <span className="px-2 text-xs text-zinc-400">You</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SettingsCard>

      {sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            {rangeStart}–{rangeEnd} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-8 px-2"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="px-2 tabular-nums">
              {safePage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="h-8 px-2"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create user">
        <div className="space-y-4">
          {error && !deleteTarget && <p className="text-sm text-red-600">{error}</p>}
          <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <Select
            label="Role in this channel"
            options={CHANNEL_MEMBER_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] ?? r }))}
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
          />
          <Input
            label="Organization"
            placeholder="e.g. Studio Alpha"
            value={form.organization}
            onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button loading={loading} onClick={handleCreate}>Create user</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={canManageRoles ? 'Delete user' : 'Remove from channel'}>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-zinc-600">
            {canManageRoles ? (
              <>Permanently delete <span className="font-semibold text-zinc-900">{deleteTarget?.name}</span>? This removes their account entirely.</>
            ) : (
              <>Remove <span className="font-semibold text-zinc-900">{deleteTarget?.name}</span> from {channelName}? Their account stays active in other channels.</>
            )}
          </p>
          {error && deleteTarget && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button loading={deleteLoading} onClick={handleRemove} className="bg-red-600 hover:bg-red-700">
              {canManageRoles ? 'Delete user' : 'Remove from channel'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )

  if (embedded) {
    return (
      <SettingsPanel
        title={`${channelName} members`}
        description="People with access to this channel and their role here."
      >
        <div className="space-y-6">{content}</div>
      </SettingsPanel>
    )
  }

  return <div className="space-y-6">{content}</div>
}
