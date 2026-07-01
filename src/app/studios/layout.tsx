import { ReactNode } from 'react'
import { getSessionProfile } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/views'
import { StudiosShell } from '@/components/studios/StudiosShell'

export default async function StudiosLayout({ children }: { children: ReactNode }) {
  const profile = await getSessionProfile()

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-violet-50/30">
        {children}
      </div>
    )
  }

  return (
    <StudiosShell isSuperAdmin={isSuperAdmin(profile.role)}>
      {children}
    </StudiosShell>
  )
}
