import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSessionProfile } from '@/lib/auth'
import { ACTIVE_CHANNEL_COOKIE, getChannelBySlug } from '@/lib/channels'
import { fetchUserChannelSlugs } from '@/lib/data/channel-access'

type Context = { params: Promise<{ slug: string }> }

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params
  const profile = await getSessionProfile()
  if (!profile) {
    return NextResponse.redirect(new URL('/login', _request.url))
  }

  const channel = getChannelBySlug(slug)
  if (!channel) {
    return NextResponse.redirect(new URL('/studios', _request.url))
  }

  const allowed = await fetchUserChannelSlugs(profile)
  if (!allowed.includes(slug)) {
    return NextResponse.redirect(new URL('/studios', _request.url))
  }

  const jar = await cookies()
  jar.set(ACTIVE_CHANNEL_COOKIE, slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
    sameSite: 'lax',
  })

  return NextResponse.redirect(new URL('/dashboard', _request.url))
}
