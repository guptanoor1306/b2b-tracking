import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { ACTIVE_CHANNEL_COOKIE, getChannelBySlug } from '@/lib/channels'
import { fetchUserChannelSlugs } from '@/lib/data/channel-access'

type Params = Promise<{ slug: string }>

/** GET only — sets active channel cookie (login redirect & direct links). Card clicks use enterChannel() action. */
export async function GET(_request: Request, { params }: { params: Params }) {
  const { slug } = await params
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const channel = getChannelBySlug(slug)
  if (!channel) redirect('/studios')

  const allowed = await fetchUserChannelSlugs(profile)
  if (!allowed.includes(slug)) redirect('/studios')

  const jar = await cookies()
  jar.set(ACTIVE_CHANNEL_COOKIE, slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
    sameSite: 'lax',
  })

  redirect('/dashboard')
}
