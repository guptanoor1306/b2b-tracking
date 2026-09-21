'use server'

import { revalidatePath } from 'next/cache'
import { getSessionProfile } from '@/lib/auth'
import { usesFinanceDashboard } from '@/lib/views'
import { upsertFinanceBillingMarks } from '@/lib/data/finance-billing-marks'

export async function saveFinanceBillingMarksForChannel(input: {
  monthKey: string
  marks: { projectId: string; billed: boolean }[]
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await getSessionProfile()
  if (!profile || !usesFinanceDashboard(profile.role)) {
    return { ok: false, error: 'Unauthorized' }
  }

  if (!/^\d{4}-\d{2}$/.test(input.monthKey)) {
    return { ok: false, error: 'Invalid billing month' }
  }

  if (!input.marks.length) {
    return { ok: false, error: 'Nothing to save' }
  }

  try {
    await upsertFinanceBillingMarks(input.monthKey, input.marks, profile.id)
    revalidatePath('/studios/finance')
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Save failed'
    return { ok: false, error: message }
  }
}
