'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, UserPlus, Trash2, Users } from 'lucide-react'
import { Profile, ChannelMember, ChannelMemberRole } from '@/lib/types'
import { STUDIOS_CHANNELS } from '@/lib/channels'
import { CHANNEL_MEMBER_ROLES, ROLE_LABELS } from '@/lib/constants'
import {
  addChannelMember,
  removeChannelMember,
  setSuperAdminRole,
  updateChannelMemberRole,
} from '@/lib/actions/channels'
import { createChannelUser } from '@/lib/actions/users'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { UserSearchSelect } from '@/components/ui/UserSearchSelect'
import {
  SettingsPanel, SettingsCard, SettingsStat, SettingsEmptyState,
} from '@/components/settings/SettingsLayout'

type Props = {
  allUsers: Profile[]
  membersByChannel: Record<string, ChannelMember[]>
}

type AddMode = 'create' | 'existing'

export function StudiosSettingsClient({ allUsers, membersByChannel }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [activeSlug, setActiveSlug] = useState(STUDIOS_CHANNELS[0].slug)
  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('create')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [exclusiveOnly, setExclusiveOnly] = useState(false)
  const [error, setError] = useState('')
  const [promoteUserId, setPromoteUserId] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'Channel Team', organization: '',
  })

  const activeChannel = STUDIOS_CHANNELS.find(c => c.slug === activeSlug)!
  const members = membersByChannel[activeSlug] ?? []
  const memberIds = useMemo(() => new Set(members.map(m => m.id)), [members])

  const superAdmins = allUsers.filter(u => u.role === 'Super Admin')
  const promotableUsers = allUsers.filter(u => u.role !== 'Super Admin')

  /** Users not yet on this channel — shown only inside Add modal */
  const addableUsers = useMemo(
    () => allUsers.filter(u => u.role !== 'Super Admin' && !memberIds.has(u.id)),
    [allUsers, memberIds]
  )

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter(m => m.is_active).length,
    admins: members.filter(m => m.channel_role === 'Channel Admin').length,
  }), [members])

  const getMemberChannelSlugs = (profileId: string): string[] =>
    Object.entries(membersByChannel)
      .filter(([, list]) => list.some(m => m.id === profileId))
      .map(([slug]) => slug)

  const openAddModal = () => {
    setError('')
    setAddMode('create')
    setSelectedUserId('')
    setExclusiveOnly(false)
    setAddOpen(true)
  }

  const handleAddExisting = () => {
    if (!selectedUserId) return
    startTransition(async () => {
      const result = await addChannelMember(
        selectedUserId,
        activeSlug,
        form.role as ChannelMemberRole,
        exclusiveOnly,
      )
      if (result.error) setError(result.error)
      else {
        setAddOpen(false)
        router.refresh()
      }
    })
  }

  const handleRemove = (profileId: string) => {
    startTransition(async () => {
      await removeChannelMember(profileId, activeSlug)
      router.refresh()
    })
  }

  const handleCreate = () => {
    setError('')
    startTransition(async () => {
      const result = await createChannelUser(form, form.role as ChannelMemberRole, activeSlug)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.userId && exclusiveOnly) {
        await addChannelMember(result.userId, activeSlug, form.role as ChannelMemberRole, true)
      }
      setAddOpen(false)
      setForm({ name: '', email: '', password: '', role: 'Channel Team', organization: '' })
      router.refresh()
    })
  }

  const handleRoleChange = (profileId: string, channelRole: ChannelMemberRole) => {
    startTransition(async () => {
      await updateChannelMemberRole(profileId, activeSlug, channelRole)
      router.refresh()
    })
  }

  const toggleSuperAdmin = (userId: string, currentRole: string) => {
    startTransition(async () => {
      await setSuperAdminRole(userId, currentRole !== 'Super Admin')
      router.refresh()
    })
  }

  const handlePromoteSuperAdmin = () => {
    if (!promoteUserId) return
    const user = promotableUsers.find(u => u.id === promoteUserId)
    if (!user) return
    startTransition(async () => {
      await setSuperAdminRole(promoteUserId, true)
      setPromoteUserId('')
      router.refresh()
    })
  }

  return (
    <div className="theme-v2 mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/studios"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-800"
      >
        <ArrowLeft size={16} />
        Back to channels
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Channel settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Each tab lists only members with access to that channel.
        </p>
      </header>

      <SettingsCard className="mb-8" padding="sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Super Admin access</p>
        {superAdmins.length === 0 ? (
          <p className="text-sm text-zinc-500">No Super Admins yet.</p>
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {superAdmins.map(u => (
              <div
                key={u.id}
                className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm"
              >
                <Shield size={14} className="text-violet-600" />
                <span className="font-medium text-violet-900">{u.name}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggleSuperAdmin(u.id, u.role)}
                  className="text-[10px] font-semibold uppercase text-violet-700 hover:text-violet-900"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
        {promotableUsers.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <UserSearchSelect
                label="Promote to Super Admin"
                users={promotableUsers}
                value={promoteUserId}
                onChange={setPromoteUserId}
                placeholder="Search and select a user…"
                clearLabel="Clear selection"
                showEmail
              />
            </div>
            <Button
              size="sm"
              disabled={!promoteUserId || pending}
              loading={pending}
              onClick={handlePromoteSuperAdmin}
              className="shrink-0"
            >
              <Shield size={14} className="mr-1.5" />
              Promote
            </Button>
          </div>
        )}
      </SettingsCard>

      <div className="mb-6 border-b border-zinc-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Channel tabs">
          {STUDIOS_CHANNELS.map(ch => {
            const active = activeSlug === ch.slug
            const count = membersByChannel[ch.slug]?.length ?? 0
            return (
              <button
                key={ch.slug}
                type="button"
                onClick={() => setActiveSlug(ch.slug)}
                className={cn(
                  'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
                )}
              >
                {ch.name}
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                  active ? 'bg-violet-100 text-violet-700' : 'bg-zinc-100 text-zinc-500'
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      <SettingsPanel
        title={`${activeChannel.name} members`}
        description={`People explicitly granted access to ${activeChannel.name} via profile_channels`}
        action={
          <Button onClick={openAddModal} size="sm">
            <UserPlus size={16} className="mr-1.5" />
            Add member
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <SettingsStat label="Members" value={stats.total} />
          <SettingsStat label="Active" value={stats.active} />
          <SettingsStat label="Channel admins" value={stats.admins} />
        </div>

        {members.length === 0 ? (
          <SettingsEmptyState
            icon={Users}
            title="No members yet"
            description={`No one has been granted access to ${activeChannel.name} yet.`}
          />
        ) : (
          <SettingsCard padding="none" className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] uppercase text-zinc-500">
                  <th className="px-4 py-2.5 text-left font-semibold">Name</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Email</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Role</th>
                  <th className="px-4 py-2.5 text-left font-semibold">All channels</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {members.map(member => {
                  const memberChannels = getMemberChannelSlugs(member.id)
                  const otherChannels = memberChannels.filter(s => s !== activeSlug)
                  return (
                  <tr key={member.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{member.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{member.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className="max-w-[160px] rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm"
                        value={member.channel_role}
                        onChange={e => handleRoleChange(member.id, e.target.value as ChannelMemberRole)}
                        disabled={pending}
                      >
                        {CHANNEL_MEMBER_ROLES.map(r => (
                          <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {memberChannels.map(slug => {
                          const ch = STUDIOS_CHANNELS.find(c => c.slug === slug)
                          const isCurrent = slug === activeSlug
                          return (
                            <span
                              key={slug}
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                                isCurrent
                                  ? 'bg-violet-100 text-violet-800'
                                  : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                              )}
                            >
                              {ch?.name ?? slug}
                            </span>
                          )
                        })}
                      </div>
                      {otherChannels.length > 0 && (
                        <p className="mt-1 text-[10px] text-amber-600">
                          Also on {otherChannels.map(s => STUDIOS_CHANNELS.find(c => c.slug === s)?.name ?? s).join(', ')} — remove here if unintended
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs font-medium',
                        member.is_active ? 'text-emerald-600' : 'text-zinc-400'
                      )}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleRemove(member.id)}
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove from this channel"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </SettingsCard>
        )}
      </SettingsPanel>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={`Add member · ${activeChannel.name}`}>
        <div className="space-y-4">
          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => setAddMode('create')}
              className={cn(
                'flex-1 px-3 py-2 text-sm font-medium transition-colors',
                addMode === 'create' ? 'bg-violet-50 text-violet-800' : 'text-zinc-600 hover:bg-zinc-50'
              )}
            >
              Create new
            </button>
            <button
              type="button"
              onClick={() => setAddMode('existing')}
              className={cn(
                'flex-1 px-3 py-2 text-sm font-medium transition-colors',
                addMode === 'existing' ? 'bg-violet-50 text-violet-800' : 'text-zinc-600 hover:bg-zinc-50'
              )}
            >
              Add existing
            </button>
          </div>

          {addMode === 'create' ? (
            <>
              <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              <Select
                label="Role"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                options={CHANNEL_MEMBER_ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] ?? r }))}
              />
              <Input label="Organization" value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button loading={pending} onClick={handleCreate}>Create & add</Button>
              </div>
            </>
          ) : (
            <>
              <Select
                label="Select user"
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                options={[
                  { value: '', label: addableUsers.length ? 'Choose a user…' : 'No users available' },
                  ...addableUsers.map(u => ({
                    value: u.id,
                    label: `${u.name} (${u.email})`,
                  })),
                ]}
              />
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={exclusiveOnly}
                  onChange={e => setExclusiveOnly(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-zinc-700">
                  <span className="font-medium">Only this channel</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    Remove access from all other channels when adding (use for single-channel admins)
                  </span>
                </span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button loading={pending} disabled={!selectedUserId} onClick={handleAddExisting}>
                  Add to channel
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
