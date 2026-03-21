export interface BehavioralEvent {
  data_type: string
  data: Record<string, unknown>
  page_url: string
  page_path: string
}

export interface BehavioralBatch {
  session_id: string
  visitor_id: string
  events: BehavioralEvent[]
}
