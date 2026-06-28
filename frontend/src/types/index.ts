// ─── Core domain types matching the Supabase schema ───────────────────────────

export type UserRole = 'student' | 'alumni' | 'teacher';
export type ReferralStatus = 'pending' | 'accepted' | 'declined' | 'referred';
export type JobType = 'full-time' | 'part-time' | 'internship' | 'contract' | 'remote';
export type JobAppStatus = 'applied' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
export type NotificationType =
  | 'referral_received'
  | 'referral_accepted'
  | 'referral_rejected'
  | 'referral_updated'
  | 'message_received'
  | 'job_posted'
  | 'application_update'
  | 'story_posted'
  | 'mentorship_request'
  | 'mentorship_accepted'
  | 'mentorship_declined'
  | 'session_booked';
export type PostType = 'blog' | 'paper' | 'announcement';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string;
  batch_year: number;

  // Identity verification
  student_id?: string | null;          // e.g. FA22-BSCS-0114

  // Alumni fields
  current_company?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  is_open_to_referrals?: boolean;

  // Student fields
  graduation_year?: number | null;
  skills?: string[];

  // Further education (alumni/teachers also pursuing MS, MBA, PhD, etc.)
  further_edu_degree?:      string | null;   // e.g. "MS Computer Science"
  further_edu_institution?: string | null;   // e.g. "FAST-NU"
  further_edu_since?:       string | null;   // e.g. "2024"

  // Shared
  bio?: string | null;
  profile_picture_url?: string | null;

  // Email preferences
  email_weekly_digest?: boolean;   // opt-out flag for the weekly digest (default true)

  created_at: string;
  updated_at: string;
}

// ─── Profile Completion ────────────────────────────────────────────────────────

export interface CompletionItem {
  key: string;
  label: string;
  hint: string;
  points: number;
  done: boolean;
}

export type CompletionLevel = 'starter' | 'rising' | 'established' | 'pro' | 'complete';

export interface ProfileCompletion {
  score: number;             // 0-100 (percentage)
  items: CompletionItem[];
  level: CompletionLevel;
  levelLabel: string;
  levelColor: string;        // tailwind colour name
  nextMilestone: number;     // next target: 25 / 50 / 75 / 100
  ptsToNextMilestone: number;
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

// ─── Jobs ──────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  posted_by: string;
  title: string;
  company: string;
  description: string;
  requirements?: string | null;
  job_type: JobType;
  location?: string | null;
  is_remote: boolean;
  apply_url?: string | null;
  apply_email?: string | null;
  tags?: string[] | null;
  deadline?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Joined
  poster?: Pick<Profile, 'id' | 'full_name' | 'job_title' | 'current_company' | 'role'>;
  application_count?: number;
  my_application?: JobApplication | null;
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter?: string | null;
  status: JobAppStatus;
  created_at: string;

  // Joined
  applicant?: Pick<Profile, 'id' | 'full_name' | 'department' | 'batch_year' | 'skills' | 'linkedin_url' | 'github_url'>;
  job?: Pick<Job, 'id' | 'title' | 'company'>;
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── Success Stories ──────────────────────────────────────────────────────────

export interface SuccessStory {
  id: string;
  user_id: string;
  referral_id?: string | null;
  referred_by_id?: string | null;
  company: string;
  role: string;
  department?: string | null;
  batch_year?: number | null;
  message?: string | null;
  is_anonymous: boolean;
  created_at: string;

  // Joined
  user?: Pick<Profile, 'id' | 'full_name' | 'department' | 'batch_year' | 'profile_picture_url'>;
  referred_by?: Pick<Profile, 'id' | 'full_name' | 'job_title' | 'current_company'>;
}

// ─── Blog / Knowledge ─────────────────────────────────────────────────────────

export interface Post {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  body: string;
  excerpt?: string | null;
  tags?: string[] | null;
  post_type: PostType;
  cover_image_url?: string | null;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
  updated_at: string;

  author?: Pick<Profile, 'id' | 'full_name' | 'role' | 'department'>;
}

// ─── Interview Prep Corner ──────────────────────────────────────────────────

export type InterviewDifficulty = 'easy' | 'medium' | 'hard';
export type InterviewOutcome    = 'offer' | 'rejected' | 'in_progress' | 'withdrew';
export type ResourceType        = 'guide' | 'question_bank' | 'cheatsheet' | 'video' | 'article' | 'course' | 'other';

export interface InterviewExperience {
  id: string;
  author_id: string;
  company: string;
  role: string;
  department?: string | null;
  interview_date?: string | null;
  difficulty: InterviewDifficulty;
  outcome: InterviewOutcome;
  num_rounds?: number | null;
  process: string;
  questions: string;
  tips?: string | null;
  tags?: string[] | null;
  is_anonymous: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;

  // From the read view (interview_experiences_feed): author identity is nulled for
  // anonymous rows unless you're the owner. i_found_helpful is computed client-side.
  author_name?: string | null;
  author_batch_year?: number | null;
  i_found_helpful?: boolean;
}

export interface PrepResource {
  id: string;
  author_id: string;
  title: string;
  resource_type: ResourceType;
  url?: string | null;
  description: string;
  tags?: string[] | null;
  helpful_count: number;
  created_at: string;
  updated_at: string;

  // Joined / client-computed
  author?: Pick<Profile, 'id' | 'full_name' | 'role' | 'job_title' | 'current_company'>;
  i_found_helpful?: boolean;
}

export interface InterviewExperienceFormData {
  company: string;
  role: string;
  interview_date?: string;
  difficulty: InterviewDifficulty;
  outcome: InterviewOutcome;
  num_rounds?: number | null;
  process: string;
  questions: string;
  tips?: string;
  tags?: string[];
  is_anonymous: boolean;
}

export interface PrepResourceFormData {
  title: string;
  resource_type: ResourceType;
  url?: string;
  description: string;
  tags?: string[];
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface ReferralFormData {
  company: string;
  role: string;
  job_url?: string;
  message: string;
  resume_url?: string;
}

export interface ProfileFormData {
  full_name?: string;
  bio?: string;
  department?: string;
  batch_year?: number;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  current_company?: string;
  job_title?: string;
  is_open_to_referrals?: boolean;
  skills?: string[];
  graduation_year?: number;
}

export interface SignupFormData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  department: string;
  batch_year: number;
  student_id?: string;
}

export interface JobFormData {
  title: string;
  company: string;
  description: string;
  requirements?: string;
  job_type: JobType;
  location?: string;
  is_remote: boolean;
  apply_url?: string;
  apply_email?: string;
  tags?: string[];
  deadline?: string;
}

// ─── MAJU ID validation ───────────────────────────────────────────────────────

const DEPT_CODES = [
  'BSCS', 'BSSE', 'BBA', 'BSIT', 'BSCE', 'BSEE', 'BSAI', 'BSCYS',
  'BS', 'MS', 'MBA', 'PHD', 'MCS', 'MIT', 'MCM',
  'BSBA', 'BSAF', 'BSPS', 'BSBI',
].join('|');

const MAJU_ID_REGEX = new RegExp(
  `^(FA|SP)\\d{2}-(${DEPT_CODES})[A-Z]*-\\d{3,4}$`,
  'i'
);

/** Validate MAJU student/alumni ID format loosely, e.g. FA22-BSCS-0114 */
export function validateMajuId(id: string): boolean {
  return MAJU_ID_REGEX.test(id.trim());
}

/** Extract student ID from MAJU university email (fa22bscs0114@maju.edu.pk) */
export function extractIdFromEmail(email: string): string | null {
  const local = email.split('@')[0]?.toUpperCase();
  if (!local) return null;
  // Try to reconstruct: FA22BSCS0114 → FA22-BSCS-0114
  const match = local.match(/^(FA|SP)(\d{2})([A-Z]+)(\d{3,4})$/);
  if (!match) return null;
  return `${match[1]}${match[2]}-${match[3]}-${match[4]}`;
}

// ─── API response helpers ─────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  errors?: Array<{ msg: string; path: string }>;
}

export const DEPARTMENTS = [
  'Computer Science',
  'Software Engineering',
  'CyberSecurity',
  'Artificial Intelligence',
  'Business Administration',
  'Fintech',
  'Business Computing',
  'BioTechnology',
  'Accounting and Finance',
  'Psychology',
  'Management Science',
  'BioInformatics',
  'Project Management',
  'BioScience',
  'Other',
] as const;

export type Department = typeof DEPARTMENTS[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  'full-time':  'Full-time',
  'part-time':  'Part-time',
  'internship': 'Internship',
  'contract':   'Contract',
  'remote':     'Remote',
};

export const JOB_TYPE_COLORS: Record<JobType, string> = {
  'full-time':  'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  'part-time':  'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  'internship': 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  'contract':   'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  'remote':     'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
};

// ─── Interview Prep labels & colours ────────────────────────────────────────

export const DIFFICULTY_LABELS: Record<InterviewDifficulty, string> = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard',
};

export const DIFFICULTY_COLORS: Record<InterviewDifficulty, string> = {
  easy:   'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  medium: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  hard:   'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
};

export const OUTCOME_LABELS: Record<InterviewOutcome, string> = {
  offer: 'Got offer', rejected: 'Rejected', in_progress: 'In progress', withdrew: 'Withdrew',
};

export const OUTCOME_COLORS: Record<InterviewOutcome, string> = {
  offer:       'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  rejected:    'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  in_progress: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  withdrew:    'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700',
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  guide: 'Guide', question_bank: 'Question Bank', cheatsheet: 'Cheatsheet',
  video: 'Video', article: 'Article', course: 'Course', other: 'Other',
};

// ─── Mentorship Program ────────────────────────────────────────────────────────

export type MentorshipRequestStatus = 'pending' | 'accepted' | 'declined' | 'ended' | 'cancelled';
export type SessionStatus           = 'scheduled' | 'completed' | 'cancelled';
export type SessionFormat           = 'video' | 'in_person' | 'both' | 'async_chat';

export const MENTOR_AREAS = [
  'Career Guidance',
  'Technical Skills',
  'Research',
  'Entrepreneurship',
  'MBA / MS Guidance',
  'Industry Insights',
  'Job Search',
  'Interview Prep',
  'Networking',
  'Work-Life Balance',
  'Leadership',
  'Project Management',
] as const;
export type MentorArea = typeof MENTOR_AREAS[number];

export const SESSION_FORMAT_LABELS: Record<SessionFormat, string> = {
  video:       'Video Call',
  in_person:   'In-Person',
  both:        'Video or In-Person',
  async_chat:  'Async Chat',
};

export const SESSION_DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;

export interface Mentor {
  id: string;
  areas: string[];
  tagline?: string | null;
  mentorship_bio?: string | null;
  max_mentees: number;
  is_accepting: boolean;
  session_format: SessionFormat;
  meeting_link?: string | null;
  active_mentee_count: number;
  created_at: string;
  updated_at: string;

  // From mentors_with_stats view (joined from profiles)
  full_name: string;
  department: string;
  batch_year: number;
  current_company?: string | null;
  job_title?: string | null;
  profile_picture_url?: string | null;
  linkedin_url?: string | null;
  avg_rating: number;
  review_count: number;
}

export interface MentorshipRequest {
  id: string;
  student_id: string;
  mentor_id: string;
  area: string;
  goal: string;
  status: MentorshipRequestStatus;
  mentor_note?: string | null;
  created_at: string;
  updated_at: string;

  student?: Pick<Profile, 'id' | 'full_name' | 'department' | 'batch_year' | 'profile_picture_url' | 'skills'>;
  mentor?:  Pick<Profile, 'id' | 'full_name' | 'job_title' | 'current_company' | 'profile_picture_url'>;
}

export interface MentorSession {
  id: string;
  request_id: string;
  mentor_id: string;
  student_id: string;
  scheduled_at: string;
  duration_mins: number;
  agenda: string;
  status: SessionStatus;
  session_notes?: string | null;
  created_at: string;
  updated_at: string;

  mentor?:   Pick<Profile, 'id' | 'full_name' | 'profile_picture_url'>;
  student?:  Pick<Profile, 'id' | 'full_name' | 'profile_picture_url'>;
  my_review?: MentorReview | null;
}

export interface MentorReview {
  id: string;
  session_id: string;
  reviewer_id: string;
  mentor_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;

  reviewer?: Pick<Profile, 'id' | 'full_name' | 'department' | 'batch_year'>;
}
