'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'
import type { KanbanBoard } from '@/components/board/KanbanBoard'

const KanbanBoardLazy = dynamic(
  () => import('@/components/board/KanbanBoard').then(mod => mod.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-zinc-200/80 bg-white/60 shadow-sm overflow-hidden">
        <div className="h-[420px] animate-pulse bg-zinc-50" />
      </div>
    ),
  },
)

type Props = ComponentProps<typeof KanbanBoard>

export function KanbanBoardClient(props: Props) {
  return <KanbanBoardLazy {...props} />
}
