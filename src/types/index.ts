export type MeetingType = 'customer' | 'internal' | 'partner';
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';
export type CommitmentParty = 'me' | 'them';

export interface Company {
  id: string;
  name: string;
  notes?: string;
  created_at: string;
}

export interface Contact {
  id: string;
  company_id?: string;
  name: string;
  role?: string;
  email?: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  company_id?: string;
  contact_ids?: string[];
  scheduled_at: string;
  ended_at?: string;
  summary?: string;
  transcript?: string;
  raw_notes?: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  meeting_id?: string;
  company_id?: string;
  assignee?: string;
  due_date?: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  meeting_id: string;
  content: string;
  created_at: string;
}

export interface Commitment {
  id: string;
  meeting_id: string;
  party: CommitmentParty;
  content: string;
  due_date?: string;
  resolved: boolean;
  created_at: string;
}
