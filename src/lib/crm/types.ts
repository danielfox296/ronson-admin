export type ContactCategory =
  | 'investor' | 'advisor' | 'mentor' | 'retail_prospect' | 'retail_partner'
  | 'attorney' | 'tech_partner' | 'acquirer' | 'media' | 'vendor' | 'other';

export type ContactStatus =
  | 'not_started' | 'outreach_sent' | 'in_conversation' | 'meeting_scheduled'
  | 'proposal_sent' | 'negotiating' | 'committed' | 'closed_won' | 'closed_lost'
  | 'passive' | 'archived';

export type InteractionType =
  | 'email_sent' | 'email_received' | 'linkedin_message' | 'linkedin_connection'
  | 'call' | 'meeting_in_person' | 'meeting_video' | 'text_message' | 'note'
  | 'referral_made' | 'referral_received';

export type InteractionOutcome =
  | 'no_response' | 'acknowledged' | 'interested' | 'not_interested'
  | 'referred_elsewhere' | 'meeting_booked' | 'commitment_made' | 'paperwork_in_progress';

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  preferred_name?: string | null;
  email?: string | null;
  email_alt?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  twitter_handle?: string | null;
  website_url?: string | null;
  organization_name?: string | null;
  title?: string | null;
  client_id?: string | null;
  category: ContactCategory;
  sub_category?: string | null;
  status: ContactStatus;
  priority: number;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  source?: string | null;
  source_detail?: string | null;
  notes?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
  // computed
  last_interaction_at?: string | null;
  open_actions_count?: number;
  tags?: string[];
  // relations (detail view)
  client?: { id: string; name: string } | null;
  interactions?: Interaction[];
  next_actions?: NextAction[];
  attachments?: ContactAttachment[];
}

export interface Interaction {
  id: string;
  contact_id: string;
  type: InteractionType;
  direction: 'inbound' | 'outbound' | 'internal';
  occurred_at: string;
  subject?: string | null;
  summary?: string | null;
  external_id?: string | null;
  external_url?: string | null;
  outcome?: InteractionOutcome | null;
  sentiment?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NextAction {
  id: string;
  contact_id: string;
  action: string;
  due_date?: string | null;
  priority: number;
  completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  // for global actions view
  contact?: { id: string; full_name: string; category: ContactCategory; status: ContactStatus };
}

export interface ContactTag {
  id: string;
  contact_id: string;
  tag: string;
  created_at: string;
}

export interface ContactAttachment {
  id: string;
  contact_id: string;
  type: string;
  title: string;
  url?: string | null;
  description?: string | null;
  created_at: string;
}

export interface CRMStats {
  total_contacts: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  open_actions: number;
  overdue_actions: number;
  stale_contacts_30d: number;
  added_this_week: number;
  interactions_this_week: number;
}

export interface ContactListMeta {
  total: number;
  limit: number;
  offset: number;
}

export const CATEGORIES: ContactCategory[] = [
  'investor', 'advisor', 'mentor', 'retail_prospect', 'retail_partner',
  'attorney', 'tech_partner', 'acquirer', 'media', 'vendor', 'other',
];

export const STATUSES: ContactStatus[] = [
  'not_started', 'outreach_sent', 'in_conversation', 'meeting_scheduled',
  'proposal_sent', 'negotiating', 'committed', 'closed_won', 'closed_lost',
  'passive', 'archived',
];

export const PIPELINE_STATUSES: ContactStatus[] = [
  'not_started', 'outreach_sent', 'in_conversation', 'meeting_scheduled',
  'proposal_sent', 'negotiating', 'committed', 'closed_won',
];

export const INTERACTION_TYPES: InteractionType[] = [
  'email_sent', 'email_received', 'linkedin_message', 'linkedin_connection',
  'call', 'meeting_in_person', 'meeting_video', 'text_message', 'note',
  'referral_made', 'referral_received',
];

export const INTERACTION_OUTCOMES: InteractionOutcome[] = [
  'no_response', 'acknowledged', 'interested', 'not_interested',
  'referred_elsewhere', 'meeting_booked', 'commitment_made', 'paperwork_in_progress',
];

export function humanizeEnum(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
