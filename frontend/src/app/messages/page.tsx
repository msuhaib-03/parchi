'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Message } from '@/types';
import { Send, Loader2, MessageCircle, Wifi } from 'lucide-react';
import { AppNav } from '@/components/AppNav';

function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setCurrentUser(profile as Profile);

      const { data: sent } = await supabase.from('messages').select('receiver_id').eq('sender_id', user.id);
      const { data: received } = await supabase.from('messages').select('sender_id').eq('receiver_id', user.id);

      const partnerIds = Array.from(new Set([
        ...(sent ?? []).map((m) => m.receiver_id),
        ...(received ?? []).map((m) => m.sender_id),
      ]));

      if (partnerIds.length > 0) {
        const { data: partners } = await supabase
          .from('profiles')
          .select('id, full_name, job_title, current_company, role, department')
          .in('id', partnerIds);

        const { data: unreadData } = await supabase
          .from('messages').select('sender_id')
          .eq('receiver_id', user.id).eq('is_read', false);

        const unreadMap: Record<string, number> = {};
        (unreadData ?? []).forEach((m) => { unreadMap[m.sender_id] = (unreadMap[m.sender_id] ?? 0) + 1; });

        setConversations((partners ?? []).map((p) => ({ partner: p as Profile, unread: unreadMap[p.id] ?? 0 })));
      }

      setLoadingConvos(false);
      const withId = searchParams.get('with');
      if (withId) openConversation(withId, user.id);
    })();
  }, [supabase, router, searchParams]);

  const openConversation = useCallback(async (partnerId: string, userId?: string) => {
    setActivePartnerId(partnerId);
    setLoadingThread(true);
    setIsLive(false);

    const { data: partner } = await supabase.from('profiles').select('*').eq('id', partnerId).single();
    setActivePartner(partner as Profile);

    const uid = userId ?? currentUser?.id;
    if (!uid) return;

    const { data: thread } = await supabase
      .from('messages').select('*')
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${uid})`)
      .order('created_at', { ascending: true });

    setMessages((thread ?? []) as Message[]);
    setLoadingThread(false);

    await supabase.from('messages').update({ is_read: true })
      .eq('sender_id', partnerId).eq('receiver_id', uid).eq('is_read', false);

    setConversations((prev) => prev.map((c) => c.partner.id === partnerId ? { ...c, unread: 0 } : c));

    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }

    const channel = supabase.channel(`messages:${uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === partnerId) {
            setMessages((prev) => { if (prev.find((m) => m.id === msg.id)) return prev; return [...prev, msg]; });
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
          } else {
            setConversations((prev) => prev.map((c) => c.partner.id === msg.sender_id ? { ...c, unread: c.unread + 1 } : c));
          }
        }
      )
      .subscribe((status) => setIsLive(status === 'SUBSCRIBED'));

    channelRef.current = channel;
  }, [supabase, currentUser]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activePartnerId || !currentUser) return;
    setSending(true);
    const { data, error } = await supabase.from('messages')
      .insert({ sender_id: currentUser.id, receiver_id: activePartnerId, content: newMessage.trim() })
      .select().single();
    setSending(false);
    if (error) return;
    setMessages((prev) => [...prev, data as Message]);
    setNewMessage('');
    if (!conversations.find((c) => c.partner.id === activePartnerId)) {
      setConversations((prev) => [{ partner: activePartner!, unread: 0 }, ...prev]);
    }
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const isToday = date.toDateString() === new Date().toDateString();
    return isToday
      ? date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-zinc-950 transition-colors overflow-hidden">
      <AppNav userName={currentUser?.full_name} userId={currentUser?.id} unreadCount={totalUnread} />

      <div className="flex-1 flex max-w-6xl mx-auto w-full overflow-hidden">

        {/* ─── Sidebar ──────────────────────────────────────────────────────── */}
        <div className={`w-full md:w-72 shrink-0 bg-white dark:bg-zinc-900 border-r border-slate-100 dark:border-zinc-800 flex flex-col transition-colors ${activePartnerId ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
            <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Conversations</p>
          </div>

          {loadingConvos ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={22} className="animate-spin text-indigo-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
              <MessageCircle size={28} className="text-slate-200 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">No conversations yet</p>
              <Link href="/alumni" className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                Browse alumni →
              </Link>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {conversations.map(({ partner, unread }) => (
                <button
                  key={partner.id}
                  onClick={() => openConversation(partner.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors text-left border-b border-slate-50 dark:border-zinc-800/50 ${
                    activePartnerId === partner.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 border-l-2 border-l-indigo-500'
                      : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
                    {partner.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100 truncate">{partner.full_name}</p>
                      {unread > 0 && (
                        <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 truncate mt-0.5">
                      {partner.role === 'alumni' ? `${partner.job_title ?? 'Alumni'} @ ${partner.current_company ?? ''}` : partner.department}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Thread ───────────────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col ${!activePartnerId ? 'hidden md:flex' : 'flex'}`}>
          {!activePartnerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageCircle size={40} className="text-slate-200 dark:text-zinc-700 mb-4" />
              <p className="text-slate-500 dark:text-zinc-400 font-medium text-sm">Select a conversation</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">or start a new one from alumni page</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-3 shrink-0 transition-colors">
                <button className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1" onClick={() => setActivePartnerId(null)}>
                  ←
                </button>
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm shrink-0">
                  {activePartner?.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${activePartnerId}`} className="text-sm font-semibold text-slate-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400">
                    {activePartner?.full_name}
                  </Link>
                  {activePartner?.current_company && (
                    <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">
                      {activePartner.job_title} · {activePartner.current_company}
                    </p>
                  )}
                </div>
                {isLive && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                    <Wifi size={13} />
                    Live
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 bg-slate-50 dark:bg-zinc-950 transition-colors">
                {loadingThread ? (
                  <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-indigo-400" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-sm text-slate-400 dark:text-zinc-500">No messages yet.</p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Say hi to {activePartner?.full_name?.split(' ')[0]}!</p>
                  </div>
                ) : messages.map((msg) => {
                  const isMine = msg.sender_id === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 rounded-bl-sm shadow-sm'
                      }`}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMine ? 'text-indigo-200' : 'text-slate-400 dark:text-zinc-500'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Send box */}
              <div className="bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 p-3 shrink-0 transition-colors">
                <div className="flex gap-2 items-end">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message… (Enter to send)"
                    rows={1}
                    className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    style={{ maxHeight: '120px' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 text-white p-2.5 rounded-xl transition-colors shrink-0"
                  >
                    {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
      </div>
    }>
      <MessagesPage />
    </Suspense>
  );
}

interface ConversationItem { partner: Profile; unread: number; }
