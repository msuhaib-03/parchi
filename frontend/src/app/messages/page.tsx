'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Message } from '@/types';
import { ArrowLeft, Send, Loader2, MessageCircle } from 'lucide-react';

function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  // Load user + conversations
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setCurrentUser(profile as Profile);

      // Load all conversations (people you've messaged)
      const { data: sent } = await supabase
        .from('messages')
        .select('receiver_id')
        .eq('sender_id', user.id);

      const { data: received } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', user.id);

      const partnerIds = Array.from(new Set([
        ...(sent ?? []).map((m) => m.receiver_id),
        ...(received ?? []).map((m) => m.sender_id),
      ]));

      if (partnerIds.length > 0) {
        const { data: partners } = await supabase
          .from('profiles')
          .select('id, full_name, job_title, current_company, role, department')
          .in('id', partnerIds);

        // Get unread counts
        const { data: unreadData } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        const unreadMap: Record<string, number> = {};
        (unreadData ?? []).forEach((m) => {
          unreadMap[m.sender_id] = (unreadMap[m.sender_id] ?? 0) + 1;
        });

        const convos = (partners ?? []).map((p) => ({
          partner: p as Profile,
          unread: unreadMap[p.id] ?? 0,
        }));

        setConversations(convos);
      }

      setLoadingConvos(false);

      // Open conversation from query param (?with=userId)
      const withId = searchParams.get('with');
      if (withId) openConversation(withId, user.id);
    })();
  }, [supabase, router, searchParams]);

  const openConversation = useCallback(async (partnerId: string, userId?: string) => {
    setActivePartnerId(partnerId);
    setLoadingThread(true);

    // Fetch partner profile
    const { data: partner } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', partnerId)
      .single();
    setActivePartner(partner as Profile);

    // Fetch message thread
    const uid = userId ?? currentUser?.id;
    if (!uid) return;

    const { data: thread } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${uid})`)
      .order('created_at', { ascending: true });

    setMessages((thread ?? []) as Message[]);
    setLoadingThread(false);

    // Mark received messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', uid)
      .eq('is_read', false);

    // Update unread count in sidebar
    setConversations((prev) =>
      prev.map((c) => c.partner.id === partnerId ? { ...c, unread: 0 } : c)
    );
  }, [supabase, currentUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activePartnerId || !currentUser) return;
    setSending(true);

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        receiver_id: activePartnerId,
        content: newMessage.trim(),
      })
      .select()
      .single();

    setSending(false);
    if (error) return;

    setMessages((prev) => [...prev, data as Message]);
    setNewMessage('');

    // Add to conversations if new
    if (!conversations.find((c) => c.partner.id === activePartnerId)) {
      setConversations((prev) => [
        { partner: activePartner!, unread: 0 },
        ...prev,
      ]);
    }
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-100 shrink-0">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
        </div>
      </nav>

      <div className="flex-1 flex max-w-6xl mx-auto w-full overflow-hidden">

        {/* ─── Sidebar ────────────────────────────────────────────────────────── */}
        <div className={`w-full md:w-80 shrink-0 bg-white border-r border-gray-100 flex flex-col ${activePartnerId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Conversations</p>
          </div>

          {loadingConvos ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
              <MessageCircle size={32} className="text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">Find an alumni and start a chat</p>
              <Link href="/alumni" className="mt-4 text-sm text-indigo-600 font-medium hover:underline">
                Browse alumni →
              </Link>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {conversations.map(({ partner, unread }) => (
                <button
                  key={partner.id}
                  onClick={() => openConversation(partner.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${
                    activePartnerId === partner.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                    {partner.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 truncate">{partner.full_name}</p>
                      {unread > 0 && (
                        <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {partner.role === 'alumni' ? `${partner.job_title ?? 'Alumni'} @ ${partner.current_company ?? ''}` : partner.department}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Thread ─────────────────────────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col ${!activePartnerId ? 'hidden md:flex' : 'flex'}`}>
          {!activePartnerId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <MessageCircle size={48} className="text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">Select a conversation</p>
              <p className="text-sm text-gray-400 mt-1">or start a new one from the alumni page</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
                <button
                  className="md:hidden text-gray-400 hover:text-gray-700"
                  onClick={() => setActivePartnerId(null)}
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                  {activePartner?.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <Link href={`/profile/${activePartnerId}`} className="text-sm font-semibold text-gray-900 hover:text-indigo-600">
                    {activePartner?.full_name}
                  </Link>
                  {activePartner?.current_company && (
                    <p className="text-xs text-gray-400">
                      {activePartner.job_title} @ {activePartner.current_company}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loadingThread ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-sm text-gray-400">No messages yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Say hi to {activePartner?.full_name?.split(' ')[0]}! 👋</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === currentUser?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-br-sm'
                            : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm shadow-sm'
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Send box */}
              <div className="bg-white border-t border-gray-100 p-4 shrink-0">
                <div className="flex gap-3 items-end">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message… (Enter to send)"
                    rows={1}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    style={{ maxHeight: '120px' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white p-3 rounded-xl transition-colors shrink-0"
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
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

// Wrap in Suspense so useSearchParams doesn't break static export
export default function MessagesPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-400" /></div>}>
      <MessagesPage />
    </Suspense>
  );
}

interface ConversationItem {
  partner: Profile;
  unread: number;
}
