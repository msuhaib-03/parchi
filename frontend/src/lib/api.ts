// ─── Typed API client for the Express backend ─────────────────────────────────
import { createClient } from './supabase/client';
import type { Profile, ReferralRequest, ReferralFormData, ProfileFormData, Message, Conversation } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

// ─── User / Profile ───────────────────────────────────────────────────────────

export const usersApi = {
  getMe: () => request<Profile>('/users/me'),

  updateProfile: (payload: ProfileFormData) =>
    request<Profile>('/users/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAlumni: (params: {
    department?: string;
    company?: string;
    open_to_referrals?: boolean;
    page?: number;
  }) => {
    const q = new URLSearchParams();
    if (params.department) q.set('department', params.department);
    if (params.company) q.set('company', params.company);
    if (params.open_to_referrals) q.set('open_to_referrals', 'true');
    if (params.page) q.set('page', String(params.page));
    return request<{ alumni: Profile[]; total: number }>(`/users/alumni?${q}`);
  },

  getProfile: (id: string) => request<Profile>(`/users/${id}`),
};

// ─── Referrals ────────────────────────────────────────────────────────────────

export const referralsApi = {
  send: (alumniId: string, payload: ReferralFormData) =>
    request<ReferralRequest>('/referrals', {
      method: 'POST',
      body: JSON.stringify({ alumni_id: alumniId, ...payload }),
    }),

  getMine: () => request<ReferralRequest[]>('/referrals/mine'),

  getInbox: (status?: string) =>
    request<ReferralRequest[]>(`/referrals/inbox${status ? `?status=${status}` : ''}`),

  updateStatus: (id: string, status: string, alumni_notes?: string) =>
    request<ReferralRequest>(`/referrals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, alumni_notes }),
    }),
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messagesApi = {
  getConversations: () => request<Conversation[]>('/messages/conversations'),

  getThread: (otherId: string) => request<Message[]>(`/messages/${otherId}`),

  send: (receiverId: string, content: string) =>
    request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId, content }),
    }),

  getUnreadCount: () => request<{ unread: number }>('/messages/unread/count'),
};
