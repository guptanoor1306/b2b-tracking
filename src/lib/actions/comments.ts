'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'

export async function dismissCommentFeedItem(commentId: string) {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('comment_feed_dismissals').upsert(
    { profile_id: profile.id, comment_id: commentId },
    { onConflict: 'profile_id,comment_id' },
  )

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
