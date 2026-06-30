import { createClient } from '@/lib/supabase/server'
import { RpCut } from '@/lib/types'

export async function fetchRpCuts(projectId: string): Promise<RpCut[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_rp_cuts')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) return []
  return (data ?? []) as RpCut[]
}
