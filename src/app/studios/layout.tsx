import { ReactNode } from 'react'

export default function StudiosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-violet-50/30">
      {children}
    </div>
  )
}
