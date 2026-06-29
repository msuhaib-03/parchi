'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { MapPin, Video, Users, Clock, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { Event, EventRsvp, EventType } from '@/types';
import { EVENT_TYPE_META, fmtEventDate, fmtEventTime } from '@/types';
import { AppNav } from '@/components/AppNav';

const RSVP_OPTS = [
  { status: 'going',     label: 'Going',     emoji: '✅' },
  { status: 'maybe',     label: 'Maybe',     emoji: '🤔' },
  { status: 'not_going', label: 'Not going', emoji: '❌' },
] as const;

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const supabase = createClient();

  const [event,   setEvent]   = useState<Event | null>(null);
  const [rsvps,   setRsvps]   = useState<EventRsvp[]>([]);
  const [myId,    setMyId]    = useState('');
  const [myName,  setMyName]  = useState('');
  const [myRsvp,  setMyRsvp]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);
  const [deleting,setDeleting]= useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: { user } }, { data: ev }, { data: rsvpData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('events').select('*, creator:profiles!created_by(id, full_name, role)').eq('id', id).single(),
        supabase.from('event_rsvps').select('*, user:profiles!user_id(id, full_name, profile_picture_url, department)').eq('event_id', id),
      ]);

      if (!ev) { router.push('/events'); return; }
      setEvent(ev as Event);
      setRsvps((rsvpData ?? []) as EventRsvp[]);

      if (user) {
        setMyId(user.id);
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        setMyName(prof?.full_name ?? '');
        const myR = (rsvpData ?? []).find((r: any) => r.user_id === user.id);
        setMyRsvp(myR?.status ?? null);
      }

      setLoading(false);
    })();
  }, [id, supabase, router]);

  const goingCount   = rsvps.filter((r) => r.status === 'going').length;
  const maybeCount   = rsvps.filter((r) => r.status === 'maybe').length;
  const isFull       = !!(event?.max_attendees && goingCount >= event.max_attendees && myRsvp !== 'going');
  const isOwner      = event?.created_by === myId;
  const now          = Date.now();
  const ended        = event?.ends_at
    ? new Date(event.ends_at).getTime() <= now
    : event ? new Date(event.starts_at).getTime() <= now - 2 * 60 * 60 * 1000 : false;
  const meta         = EVENT_TYPE_META[(event?.event_type as EventType) ?? 'other'];

  const handleRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    if (busy || ended || !myId) return;
    if (status === 'going' && isFull) { toast.error('This event is full.'); return; }
    setBusy(true);

    if (myRsvp === status) {
      const { error } = await supabase.from('event_rsvps').delete().eq('event_id', id).eq('user_id', myId);
      if (!error) {
        setRsvps((r) => r.filter((x) => x.user_id !== myId));
        setMyRsvp(null);
      } else toast.error(error.message);
    } else {
      const { data, error } = await supabase.from('event_rsvps')
        .upsert({ event_id: id, user_id: myId, status }, { onConflict: 'event_id,user_id' })
        .select('*, user:profiles!user_id(id, full_name, profile_picture_url, department)')
        .single();
      if (!error && data) {
        setRsvps((r) => {
          const filtered = r.filter((x) => x.user_id !== myId);
          return [...filtered, data as EventRsvp];
        });
        setMyRsvp(status);
        toast.success(status === 'going' ? `You're going!` : status === 'maybe' ? 'Marked as maybe.' : 'Marked as not going.');
      } else if (error) toast.error(error.message);
    }
    setBusy(false);
  };

  const handleDelete = async () => {
    if (!isOwner || !event) return;
    if (!confirm('Delete this event? This cannot be undone.')) return;
    setDeleting(true);
    const { error } = await supabase.from('events').update({ is_active: false }).eq('id', event.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Event deleted.');
    router.replace('/events');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }
  if (!event) return null;

  const goingAttendees = rsvps.filter((r) => r.status === 'going');
  const maybeAttendees = rsvps.filter((r) => r.status === 'maybe');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <AppNav userName={myName} userId={myId || undefined} />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/events" className="text-sm text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors">
          ← Back to Events
        </Link>

        <div className="mt-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden">

          {/* Cover */}
          {event.cover_url && (
            <div className="relative h-48 w-full">
              <Image src={event.cover_url} alt={event.title} fill className="object-cover" />
            </div>
          )}

          <div className="p-6">
            {/* Type + Ended badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
                {meta.emoji} {meta.label}
              </span>
              {ended && (
                <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-full">
                  Ended
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100 mb-1">{event.title}</h1>
            {event.organizer && (
              <p className="text-sm text-slate-400 dark:text-zinc-500 mb-4">Organized by {event.organizer}</p>
            )}

            {/* Details grid */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
                <Clock size={15} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                <span>{fmtEventDate(event.starts_at)} · {fmtEventTime(event.starts_at)}</span>
                {event.ends_at && <span className="text-slate-400 dark:text-zinc-500">– {fmtEventTime(event.ends_at)}</span>}
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
                  {event.is_online ? <Video size={15} className="text-slate-400 dark:text-zinc-500 shrink-0" /> : <MapPin size={15} className="text-slate-400 dark:text-zinc-500 shrink-0" />}
                  {event.is_online && event.location.startsWith('http') ? (
                    <a href={event.location} target="_blank" rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                      Join online <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span>{event.location}</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-zinc-300">
                <Users size={15} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                <span>{goingCount} going</span>
                {maybeCount > 0 && <span className="text-slate-400 dark:text-zinc-500">· {maybeCount} maybe</span>}
                {event.max_attendees && (
                  <span className="text-slate-400 dark:text-zinc-500">· {event.max_attendees - goingCount} seats left</span>
                )}
              </div>
            </div>

            {/* RSVP */}
            {!ended && (
              <div className="flex gap-2 flex-wrap mb-6">
                {RSVP_OPTS.map(({ status, label, emoji }) => (
                  <button key={status}
                    onClick={() => handleRsvp(status)}
                    disabled={busy || (status === 'going' && isFull)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      myRsvp === status
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-indigo-300 bg-white dark:bg-zinc-900'
                    }`}>
                    {emoji} {label}{status === 'going' && isFull && myRsvp !== 'going' ? ' (Full)' : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="border-t border-slate-100 dark:border-zinc-800 pt-5 mb-5">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-3">About</h2>
              <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {event.tags.map((t) => (
                  <span key={t} className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-full">{t}</span>
                ))}
              </div>
            )}

            {/* Attendees */}
            {goingAttendees.length > 0 && (
              <div className="border-t border-slate-100 dark:border-zinc-800 pt-5 mb-5">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
                  Going ({goingAttendees.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {goingAttendees.map((r) => (
                    <Link key={r.user_id} href={`/profile/${r.user_id}`}
                      className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-xl px-3 py-1.5 transition-colors">
                      {r.user?.profile_picture_url ? (
                        <Image src={r.user.profile_picture_url} alt={r.user.full_name ?? ''} width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-xs font-semibold">
                          {r.user?.full_name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">{r.user?.full_name ?? 'User'}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Creator + delete */}
            <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 flex items-center justify-between">
              <p className="text-xs text-slate-400 dark:text-zinc-500">
                Posted by{' '}
                <Link href={`/profile/${event.created_by}`} className="text-indigo-500 hover:underline">
                  {(event.creator as any)?.full_name ?? 'Unknown'}
                </Link>
              </p>
              {isOwner && (
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 hover:text-red-700 disabled:opacity-50 transition-colors">
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete event
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
