'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, MapPin, Video, Users, PlusCircle, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { Event, EventType } from '@/types';
import { EVENT_TYPE_META, fmtEventDate, fmtEventTime } from '@/types';

// ─── RSVP inline buttons ──────────────────────────────────────────────────────

const RSVP_OPTIONS = [
  { status: 'going',     label: 'Going',     activeClass: 'bg-indigo-600 text-white border-indigo-600' },
  { status: 'maybe',     label: 'Maybe',     activeClass: 'bg-amber-500 text-white border-amber-500'   },
  { status: 'not_going', label: 'Not going', activeClass: 'bg-slate-500 text-white border-slate-500'   },
] as const;

function RsvpButtons({
  eventId, myRsvp, goingCount, maxAttendees, ended,
  onRsvpChange,
}: {
  eventId: string; myRsvp: string | null; goingCount: number;
  maxAttendees?: number | null; ended: boolean;
  onRsvpChange: (eventId: string, newStatus: string | null, delta: number) => void;
}) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);

  const isFull = !!maxAttendees && goingCount >= maxAttendees && myRsvp !== 'going';

  const handleRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
    if (busy || ended) return;
    if (status === 'going' && isFull) { toast.error('This event is full.'); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sign in to RSVP.'); setBusy(false); return; }

    if (myRsvp === status) {
      const { error } = await supabase.from('event_rsvps')
        .delete().eq('event_id', eventId).eq('user_id', user.id);
      if (error) { toast.error(error.message); } else {
        onRsvpChange(eventId, null, status === 'going' ? -1 : 0);
      }
    } else {
      const delta = status === 'going' ? 1 : myRsvp === 'going' ? -1 : 0;
      const { error } = await supabase.from('event_rsvps')
        .upsert({ event_id: eventId, user_id: user.id, status });
      if (error) { toast.error(error.message); } else {
        onRsvpChange(eventId, status, delta);
      }
    }
    setBusy(false);
  };

  if (ended) {
    return <span className="text-xs text-slate-400 dark:text-zinc-500 italic">Event ended</span>;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {RSVP_OPTIONS.map(({ status, label, activeClass }) => (
        <button key={status}
          onClick={() => handleRsvp(status)}
          disabled={busy || (status === 'going' && isFull && myRsvp !== 'going')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
            myRsvp === status
              ? activeClass
              : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
          }`}
        >
          {busy && myRsvp === status ? '…' : label}
          {status === 'going' && isFull && myRsvp !== 'going' ? ' (Full)' : ''}
        </button>
      ))}
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event, myId, onRsvpChange }: {
  event: Event & { going_count: number; my_rsvp: string | null };
  myId: string;
  onRsvpChange: (eventId: string, newStatus: string | null, delta: number) => void;
}) {
  const meta    = EVENT_TYPE_META[event.event_type as EventType] ?? EVENT_TYPE_META.other;
  const now     = Date.now();
  const started = new Date(event.starts_at).getTime() <= now;
  const ended   = event.ends_at ? new Date(event.ends_at).getTime() <= now : started && now - new Date(event.starts_at).getTime() > 2 * 60 * 60 * 1000;
  const isOwner = event.created_by === myId;
  const seatsLeft = event.max_attendees ? event.max_attendees - event.going_count : null;

  return (
    <div className={`bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden transition-colors ${ended ? 'opacity-70 border-slate-100 dark:border-zinc-800' : 'border-slate-100 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-800'}`}>
      {/* Cover image */}
      {event.cover_url && (
        <div className="relative h-32 w-full overflow-hidden">
          <Image src={event.cover_url} alt={event.title} fill className="object-cover" />
          {ended && (
            <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
              <span className="text-white text-sm font-semibold bg-slate-800/80 px-3 py-1 rounded-full">Ended</span>
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl shrink-0">{meta.emoji}</span>
            <div className="min-w-0">
              <Link href={`/events/${event.id}`} className="font-bold text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                {event.title}
              </Link>
              {event.organizer && (
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">by {event.organizer}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs font-medium px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full">
              {meta.label}
            </span>
            {ended && !event.cover_url && (
              <span className="text-xs text-slate-400 dark:text-zinc-500">Ended</span>
            )}
          </div>
        </div>

        {/* Date + location */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-300">
            <Clock size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
            <span>{fmtEventDate(event.starts_at)} · {fmtEventTime(event.starts_at)}</span>
            {event.ends_at && <span className="text-slate-400 dark:text-zinc-500">– {fmtEventTime(event.ends_at)}</span>}
          </div>
          {event.location && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-zinc-300">
              {event.is_online ? <Video size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" /> : <MapPin size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />}
              <span className="truncate">{event.is_online ? 'Online' : event.location}</span>
            </div>
          )}
        </div>

        {/* Attendee count */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-zinc-500">
            <Users size={12} />
            <span>{event.going_count} going</span>
            {seatsLeft !== null && seatsLeft > 0 && <span>· {seatsLeft} seats left</span>}
            {seatsLeft !== null && seatsLeft === 0 && <span className="text-red-500 dark:text-red-400">· Full</span>}
          </div>
          {isOwner && (
            <Link href={`/events/${event.id}`} className="text-xs text-indigo-500 hover:underline">Manage</Link>
          )}
        </div>

        {/* RSVP */}
        <RsvpButtons
          eventId={event.id}
          myRsvp={event.my_rsvp}
          goingCount={event.going_count}
          maxAttendees={event.max_attendees}
          ended={ended}
          onRsvpChange={onRsvpChange}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type EventWithMeta = Event & { going_count: number; my_rsvp: string | null };

export default function EventsPage() {
  const supabase = createClient();
  const [events,  setEvents]  = useState<EventWithMeta[]>([]);
  const [myId,    setMyId]    = useState('');
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    (async () => {
      const [{ data: { user } }, { data: raw }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('events')
          .select('*, creator:profiles!created_by(id, full_name, role), event_rsvps(user_id, status)')
          .eq('is_active', true)
          .order('starts_at', { ascending: true }),
      ]);

      if (user) setMyId(user.id);

      const now = Date.now();
      setEvents((raw ?? []).map((e: any) => {
        const rsvps: { user_id: string; status: string }[] = e.event_rsvps ?? [];
        return {
          ...e,
          going_count: rsvps.filter((r) => r.status === 'going').length,
          my_rsvp:     user ? (rsvps.find((r) => r.user_id === user.id)?.status ?? null) : null,
        } as EventWithMeta;
      }));

      setLoading(false);
    })();
  }, [supabase]);

  const handleRsvpChange = (eventId: string, newStatus: string | null, delta: number) => {
    setEvents((prev) => prev.map((e) =>
      e.id !== eventId ? e : { ...e, my_rsvp: newStatus, going_count: e.going_count + delta }
    ));
  };

  const now = Date.now();
  const { upcoming, past } = useMemo(() => ({
    upcoming: events.filter((e) => new Date(e.starts_at).getTime() > now - 2 * 60 * 60 * 1000),
    past:     events.filter((e) => new Date(e.starts_at).getTime() <= now - 2 * 60 * 60 * 1000),
  }), [events, now]);

  const shown = tab === 'upcoming' ? upcoming : [...past].reverse();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={22} className="text-indigo-500" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">Events</h1>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-sm">MAJU community events — clubs, competitions, meetups.</p>
          </div>
          <Link href="/events/new"
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <PlusCircle size={15} /> Create
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-zinc-800/60 rounded-xl p-1 w-fit">
          {(['upcoming', 'past'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors capitalize ${
                tab === t
                  ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}>
              {t} {t === 'upcoming' ? `(${upcoming.length})` : `(${past.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : shown.length === 0 ? (
          <div className="text-center py-20">
            <CalendarDays size={32} className="mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
            <p className="text-slate-500 dark:text-zinc-400 text-sm">
              {tab === 'upcoming' ? 'No upcoming events yet.' : 'No past events.'}
            </p>
            {tab === 'upcoming' && (
              <Link href="/events/new" className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                <PlusCircle size={15} /> Be the first to create one
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {shown.map((e) => (
              <EventCard key={e.id} event={e} myId={myId} onRsvpChange={handleRsvpChange} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
