import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type FinanceBillingMark = {
  projectId: string
  monthKey: string
  billed: boolean
}

function billingMarksClient() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : null
}

export async function fetchFinanceBillingMarks(
  monthKeys: string[],
  projectIds: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>()
  if (!monthKeys.length || !projectIds.length) return map

  const supabase = billingMarksClient() ?? await createClient()
  const idChunkSize = 80

  for (const monthKey of monthKeys) {
    for (let i = 0; i < projectIds.length; i += idChunkSize) {
      const chunk = projectIds.slice(i, i + idChunkSize)
      const { data, error } = await supabase
        .from('finance_billing_marks')
        .select('project_id, billed')
        .eq('month_key', monthKey)
        .in('project_id', chunk)

      if (error) {
        if (error.code === '42P01') return map
        throw error
      }

      for (const row of data ?? []) {
        map.set(`${monthKey}:${row.project_id}`, row.billed === true)
      }
    }
  }

  return map
}

export function billingMarkLookup(
  marks: Map<string, boolean>,
  monthKey: string,
  projectId: string,
): boolean {
  return marks.get(`${monthKey}:${projectId}`) ?? false
}

export async function upsertFinanceBillingMarks(
  monthKey: string,
  entries: { projectId: string; billed: boolean }[],
  updatedBy: string,
): Promise<void> {
  if (!entries.length) return

  const supabase = await createClient()
  const rows = entries.map(e => ({
    project_id: e.projectId,
    month_key: monthKey,
    billed: e.billed,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  }))

  const { error } = await supabase
    .from('finance_billing_marks')
    .upsert(rows, { onConflict: 'project_id,month_key' })

  if (error) throw error
}
