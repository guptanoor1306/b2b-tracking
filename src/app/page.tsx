import { redirect } from 'next/navigation'
import { getLoginRedirectPath } from '@/lib/actions/channels'

export default async function Home() {
  redirect(await getLoginRedirectPath())
}
