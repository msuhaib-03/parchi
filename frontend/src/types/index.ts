// ─── Core domain types matching the Supabase schema ───────────────────────────

export type UserRole = 'student' | 'alumni';

export type ReferralStatus = 'pending' | 'accepted' | 'declined' | 'referred';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string;
  batch_year: number;

  // Alumni fields
  current_company?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  is_open_to_referrals?: boolean;

  // Student fields
  graduation_year?: number | null;
  skills?: string[];

  // Shared
  bio?: string | null;
  profile_picture_url?: string | null;

  created_at: string;
  updated_at: string;
}

export interface ReferralRequest {
  id: string;
  requester_id: string;
  alumni_id: string;
  company: string;
  role: string;
  job_url?: string | null;
  message: string;
  resume_url?: string | null;
  status: ReferralStatus;
  alumni_notes?: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields (from API)
  alumni?: Pick<Profile, 'id' | 'full_name' | 'current_company' | 'job_title' | 'profile_picture_url'>;
  requester?: Pick<Profile, 'id' | 'full_name' | 'department' | 'batch_year' | 'profile_picture_url' | 'linkedin_url' | 'skills'>;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Pick<Profile, 'id' | 'full_name' | 'profile_picture_url'>;
}

export interface Conversation {
  partner_id: string;
  partner_name: string;
  partner_picture_url?: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface SignupFormData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  department: string;
  batch_year: number;
}

export interface ProfileFormData {
  full_name: string;
  department: string;
  batch_year: number;
  bio?: string;
  // Alumni
  current_company?: string;
  job_title?: string;
  linkedin_url?: string;
  is_open_to_referrals?: boolean;
  // Student
  graduation_year?: number;
  skills?: string[];
}

export interface ReferralFormData {
  company: string;
  role: string;
  job_url?: string;
  message: string;
  resume_url?: string;
}

// ─── API response helpers ─────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  errors?: Array<{ msg: string; path: string }>;
}

export const DEPARTMENTS = [
  'Computer Science',
  'Software Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Business Administration',
  'Economics',
  'Media Sciences',
  'Mathematics',
  'Physics',
  'Other',
] as const;

export type Department = typeof DEPARTMENTS[number];
