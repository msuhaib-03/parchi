import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StoryDetailClient } from './StoryDetailClient';

interface Props { params: Promise<{ id: string }> }

// ── Server-side OG metadata (powers LinkedIn/WhatsApp link previews) ──────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id }   = await params;
  const supabase = await createClient();

  const { data: story } = await supabase
    .from('success_stories')
    .select('*, user:profiles!user_id(full_name, department, batch_year)')
    .eq('id', id)
    .single();

  if (!story) return { title: 'Story not found — Parchi' };

  const displayName = story.is_anonymous
    ? `A ${story.department || 'MAJU'} Student`
    : story.user?.full_name ?? 'A MAJUite';

  const title       = `${displayName} placed at ${story.company} via Parchi`;
  const description = story.message
    ?? `${displayName} got placed as ${story.role} at ${story.company} through a MAJU alumni referral.`;

  const ogParams = new URLSearchParams({
    company: story.company,
    role:    story.role,
    name:    story.user?.full_name ?? '',
    dept:    story.department ?? story.user?.department ?? '',
    batch:   String(story.batch_year ?? story.user?.batch_year ?? ''),
    anon:    story.is_anonymous ? '1' : '0',
  });

  const ogImageUrl = `/api/og?${ogParams}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card:        'summary_large_image',
      title,
      description,
      images:      [ogImageUrl],
    },
  };
}

// ── Page (fetches data server-side, passes to client) ─────────────────────────
export default async function StoryPage({ params }: Props) {
  const { id }   = await params;
  const supabase = await createClient();

  const { data: story } = await supabase
    .from('success_stories')
    .select(`
      *,
      user:profiles!user_id(id, full_name, department, batch_year, profile_picture_url),
      referred_by:profiles!referred_by_id(id, full_name, job_title, current_company)
    `)
    .eq('id', id)
    .single();

  if (!story) notFound();

  return <StoryDetailClient story={story} />;
}
