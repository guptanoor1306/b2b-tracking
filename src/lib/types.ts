export type Role = 'Admin' | 'Internal Team' | 'Agency' | 'Zerodha Viewer' | 'Super Admin'
export type StatusHealth = 'On track' | 'At risk' | 'Delayed' | 'On hold' | 'Delivered'
export type Priority = 'Low' | 'Medium' | 'High'

export type Profile = {
  id: string
  name: string
  email: string
  role: Role
  organization: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Agency = {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export type Editor = {
  id: string
  name: string
  email: string | null
  agency_id: string | null
  is_active: boolean
  created_at: string
  agency?: Agency
}

export type Project = {
  id: string
  content_id: string
  channel: string
  ip: string
  content_type: string
  title: string
  current_stage: string
  status_health: StatusHealth
  received_date: string | null
  picked_up_date: string | null
  delivered_date: string | null
  target_delivery_date: string | null
  level_of_video: string | null
  editor: string | null
  department: string | null
  graphic_designer_id: string | null
  stage_assignee_id: string | null
  assigned_agency_id: string | null
  internal_owner_id: string | null
  assets_link: string | null
  drive_link: string | null
  final_file_link: string | null
  thumbnail_copy: string | null
  title_copy: string | null
  thumbnail_file_link: string | null
  priority: Priority
  blocker: string | null
  next_action: string | null
  next_action_due_date: string | null
  notes: string | null
  is_external_visible: boolean
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  last_status_update_at: string
  agency?: Agency | null
  owner?: Profile | null
  graphic_designer?: Profile | null
  stage_assignee?: Profile | null
}

export type StageHistory = {
  id: string
  project_id: string
  old_stage: string | null
  new_stage: string
  changed_by: string | null
  assignee_id: string | null
  changed_at: string
  note: string | null
  is_hold_event: boolean
  changer?: Profile | null
  assignee?: Profile | null
}

export type ActivityLog = {
  id: string
  project_id: string
  action_type: string
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  updated_by: string | null
  updated_at: string
  updater?: Profile | null
}

export type Comment = {
  id: string
  project_id: string
  comment: string
  parent_id: string | null
  created_by: string | null
  created_at: string
  author?: Profile | null
}

export type DashboardStats = {
  totalActive: number
  deliveredThisMonth: number
  onHold: number
  delayed: number
  atRisk: number
  pendingAgencyAction: number
  pendingInternalAction: number
}
