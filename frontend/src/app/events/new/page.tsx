'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, MapPin, Video, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { EventType } from '@/types';
import { EVENT_TYPE_META } from '@/types';

const inputCls =
  'w-full px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm ' +
  'bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 ' +
  'placeholder:text-slate-400 dark:placeholder:text-zinc-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 transition-colors';

const EVENT_TYPES = Object.entries(EVENT_TYPE_META) as [EventType, { label: string; emoji: string }][];

export default function NewEventPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [saving,  setSaving]  = useState(false);
  const [userId,  setUserId]  = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title:         '',
    description:   '',
    event_type:    'other' as EventType,
    is_online:     false,
    location:      '',
    starts_date:   '',
    starts_time:   '',
    ends_date:     '',
    ends_time:     '',
    max_attendees: '',
    organizer:     '',
    tags:          '',
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      setLoading(false);
    })();
  }, [supabase, router]);

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim())       { toast.error('Title is required.');           return; }
    if (!form.description.trim()) { toast.error('Description is required.');      return; }
    if (!form.starts_date || !form.starts_time) { toast.error('Start date and time are required.'); return; }

    const starts_at = new Date(`${form.starts_date}T${form.starts_time}`);
    if (isNaN(starts_at.getTime()))           { toast.error('Invalid start date/time.'); return; }
    if (starts_at.getTime() < Date.now() - 60_000) { toast.error('Start time must be in the future.'); return; }

    let ends_at: Date | null = null;
    if (form.ends_date && form.ends_time) {
      ends_at = new Date(`${form.ends_date}T${form.ends_time}`);
      if (ends_at <= starts_at) { toast.error('End time must be after start time.'); return; }
    }

    const maxAtt = form.max_attendees ? parseInt(form.max_attendees, 10) : null;
    if (form.max_attendees && (isNaN(maxAtt!) || maxAtt! < 1)) { toast.error('Max attendees must be a positive number.'); return; }

    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);

    setSaving(true);
    const { data, error } = await supabase.from('events').insert({
      created_by:    userId,
      title:         form.title.trim(),
      description:   form.description.trim(),
      event_type:    form.event_type,
      is_online:     form.is_online,
      location:      form.location.trim() || null,
      starts_at:     starts_at.toISOString(),
      ends_at:       ends_at?.toISOString() ?? null,
      max_attendees: maxAtt,
      organizer:     form.organizer.trim() || null,
      tags:          tags.length > 0 ? tags : null,
    }).select('id').single();

    setSaving(false);

    if (error) { toast.error(error.message); return; }
    toast.success('Event created! Notifications sent to everyone.');
    router.replace(`/events/${data.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 py-10 px-4">
      <div className="max-w-xl mx-auto">

        <div className="mb-6">
          <Link href="/events" className="text-sm text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors">
            ← Back to Events
          </Link>
          <div className="flex items-center gap-2 mt-4">
            <CalendarDays size={20} className="text-indigo-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Create Event</h1>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Event title <span className="text-red-400">*</span>
              </label>
              <input type="text" value={form.title} onChange={f('title')}
                placeholder="e.g. ACM ICPC Qualifier 2025" required className={inputCls} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea value={form.description} onChange={f('description')} rows={4} required
                placeholder="What's this event about? Who should attend?"
                className={`${inputCls} resize-none`} />
            </div>

            {/* Event type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Event type</label>
              <select value={form.event_type} onChange={f('event_type')} className={inputCls}>
                {EVENT_TYPES.map(([val, { label, emoji }]) => (
                  <option key={val} value={val}>{emoji} {label}</option>
                ))}
              </select>
            </div>

            {/* Online / in-person */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">Format</label>
              <div className="flex gap-2">
                {[
                  { online: false, icon: MapPin, label: 'In-person' },
                  { online: true,  icon: Video,  label: 'Online'    },
                ].map(({ online, icon: Icon, label }) => (
                  <button key={label} type="button"
                    onClick={() => setForm((p) => ({ ...p, is_online: online }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                      form.is_online === online
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                    }`}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location / link */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                {form.is_online ? 'Meeting link' : 'Venue'}
                <span className="ml-1 text-xs font-normal text-slate-400 dark:text-zinc-500">(optional)</span>
              </label>
              <input type="text" value={form.location} onChange={f('location')}
                placeholder={form.is_online ? 'https://meet.google.com/...' : 'MAJU Main Campus, Karachi'}
                className={inputCls} />
            </div>

            {/* Start date + time */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Start <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.starts_date} onChange={f('starts_date')} required className={inputCls} />
                <input type="time" value={form.starts_time} onChange={f('starts_time')} required className={inputCls} />
              </div>
            </div>

            {/* End date + time */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                End <span className="ml-1 text-xs font-normal text-slate-400 dark:text-zinc-500">(optional)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.ends_date} onChange={f('ends_date')} className={inputCls} />
                <input type="time" value={form.ends_time} onChange={f('ends_time')} className={inputCls} />
              </div>
            </div>

            {/* Max attendees + organizer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                  <span className="flex items-center gap-1"><Users size={13} /> Max attendees</span>
                </label>
                <input type="number" value={form.max_attendees} onChange={f('max_attendees')}
                  placeholder="Unlimited" min={1} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">Organizer / Club</label>
                <input type="text" value={form.organizer} onChange={f('organizer')}
                  placeholder="e.g. ACM Chapter" className={inputCls} />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1.5">
                Tags <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">(comma-separated, optional)</span>
              </label>
              <input type="text" value={form.tags} onChange={f('tags')}
                placeholder="e.g. CS, programming, open to all" className={inputCls} />
            </div>

            <button type="submit" disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white font-semibold py-3 rounded-xl transition-colors">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Creating…' : 'Create event'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
