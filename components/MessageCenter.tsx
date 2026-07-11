'use client';
import { useState, useEffect, useRef } from 'react';

type Message = {
  id: number;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender_name?: string;
};

type Contact = {
  id: string;
  name: string;
  unread: number;
  lastMessage: string;
  lastAt: string;
};

export default function MessageCenter({ userId, isAdmin, trackColor }: { userId: string; isAdmin: boolean; trackColor?: string }) {
  const color = trackColor || '#D59C10';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    loadContacts();
    if (!isAdmin) loadAdmins();
  }, [userId]);

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const loadAdmins = async () => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data } = await supabase.from('profiles').select('id, full_name').eq('is_admin', true);
    setAdmins((data || []).map((p: any) => ({ id: p.id, name: p.full_name || 'Instructor' })));
  };

  const loadContacts = async () => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (!data || data.length === 0) return;

    const otherIds = [...new Set(data.map((m: any) => m.sender_id === userId ? m.recipient_id : m.sender_id) as string[])];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', otherIds);
    const nameMap: Record<string, string> = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name || 'User']));

    const contactMap: Record<string, Contact> = {};
    for (const m of data) {
      const otherId = m.sender_id === userId ? m.recipient_id : m.sender_id;
      if (!contactMap[otherId]) {
        contactMap[otherId] = { id: otherId, name: nameMap[otherId] || 'User', unread: 0, lastMessage: m.content, lastAt: m.created_at };
      }
      if (!m.read && m.recipient_id === userId) contactMap[otherId].unread++;
    }
    setContacts(Object.values(contactMap));
  };

  const loadThread = async (otherId: string) => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', [userId, otherId]);
    const nameMap: Record<string, string> = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name || 'User']));
    setThread((data || []).map((m: any) => ({ ...m, sender_name: nameMap[m.sender_id] || 'User' })));

    const unreadIds = (data || []).filter((m: any) => !m.read && m.recipient_id === userId).map((m: any) => m.id);
    if (unreadIds.length) {
      await supabase.from('messages').update({ read: true }).in('id', unreadIds);
      setContacts(prev => prev.map(c => c.id === otherId ? { ...c, unread: 0 } : c));
    }
  };

  const sendMessage = async () => {
    if (!draft.trim() || !selectedId) return;
    setSending(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('messages').insert({ sender_id: userId, recipient_id: selectedId, content: draft.trim() });
    setDraft('');
    await loadThread(selectedId);
    await loadContacts();
    setSending(false);
  };

  const startNewChat = async (adminId: string) => {
    setSelectedId(adminId);
    if (!contacts.find(c => c.id === adminId)) {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data } = await supabase.from('profiles').select('id, full_name').eq('id', adminId).single();
      if (data) setContacts(prev => [{ id: data.id, name: data.full_name || 'Instructor', unread: 0, lastMessage: '', lastAt: '' }, ...prev]);
    }
  };

  const selectedContact = contacts.find(c => c.id === selectedId) || admins.find(a => a.id === selectedId);
  const totalUnread = contacts.reduce((s, c) => s + c.unread, 0);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 500, border: '1px solid #2A2F35', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ width: 240, borderRight: '1px solid #2A2F35', display: 'flex', flexDirection: 'column', background: '#1A1D21', flexShrink: 0 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #2A2F35' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Messages {totalUnread > 0 && <span style={{ background: '#F87171', color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 5px', marginLeft: 4 }}>{totalUnread}</span>}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {contacts.map(c => (
            <div key={c.id} onClick={() => setSelectedId(c.id)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #2A2F35', background: selectedId === c.id ? 'rgba(213,156,16,0.06)' : 'transparent', borderLeft: selectedId === c.id ? `2px solid ${color}` : '2px solid transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}>{c.name}</span>
                {c.unread > 0 && <span style={{ background: color, color: '#1A1D21', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 5px', fontFamily: 'JetBrains Mono, monospace' }}>{c.unread}</span>}
              </div>
              {c.lastMessage && <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</div>}
            </div>
          ))}

          {!isAdmin && admins.filter(a => !contacts.find(c => c.id === a.id)).map(a => (
            <div key={a.id} onClick={() => startNewChat(a.id)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #2A2F35', opacity: 0.6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}>{a.name}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>Start a conversation</div>
            </div>
          ))}

          {contacts.length === 0 && admins.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>No messages yet</div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#22262B' }}>
        {!selectedId ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3A3F46', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
            Select a conversation
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #2A2F35', fontSize: 14, fontWeight: 700, color: '#F5F5F5' }}>
              {selectedContact?.name || 'Conversation'}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {thread.map(m => {
                const mine = m.sender_id === userId;
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '75%' }}>
                      {!mine && <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 3, fontFamily: 'JetBrains Mono, monospace' }}>{m.sender_name}</div>}
                      <div style={{ padding: '9px 14px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: mine ? color : '#1A1D21', color: mine ? '#1A1D21' : '#F5F5F5', fontSize: 13, lineHeight: 1.5, fontWeight: mine ? 500 : 400 }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize: 10, color: '#3A3F46', marginTop: 3, textAlign: mine ? 'right' : 'left', fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid #2A2F35', display: 'flex', gap: 10 }}>
              <input
                name="message-input"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message..."
                style={{ flex: 1, background: '#1A1D21', border: '1px solid #2A2F35', borderRadius: 50, padding: '9px 16px', fontSize: 13, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
              />
              <button onClick={sendMessage} disabled={sending || !draft.trim()} style={{ background: color, border: 'none', borderRadius: 50, padding: '9px 20px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: sending ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
