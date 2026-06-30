'use client'

import { createContext, useContext, ReactNode } from 'react'
import { StudioChannel } from '@/lib/channels'
import { ChannelMemberRole } from '@/lib/types'

type ChannelContextValue = {
  channel: StudioChannel
  channelRole: ChannelMemberRole | null
}

const ChannelContext = createContext<ChannelContextValue | null>(null)

export function ChannelProvider({
  channel, channelRole, children,
}: { channel: StudioChannel; channelRole: ChannelMemberRole | null; children: ReactNode }) {
  return (
    <ChannelContext.Provider value={{ channel, channelRole }}>
      {children}
    </ChannelContext.Provider>
  )
}

export function useActiveChannel() {
  return useContext(ChannelContext)?.channel ?? null
}

export function useActiveChannelRole() {
  return useContext(ChannelContext)?.channelRole ?? null
}
