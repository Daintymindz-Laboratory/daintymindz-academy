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
  course_id: number | null;
};

type Contact = {
  key: string;
  id: string;
  name: string;
  unread: number;
  lastMessage: string;
  lastAt: string;
  courseId: number | null;
  courseTitle: string;
};

type InstructorOption = { id: string; name: string; courseId: number; courseTitle: string };

const calendarDay = (value: string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const formatDateLabel = (value: string) => {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (calendarDay(value) === calendarDay(today.toISOString())) return 'Today';
  if (calendarDay(value) === calendarDay(yesterday.toISOString())) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
};

const formatMessageTimestamp = (value: string) => new Date(value).toLocaleString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function MessageCenter({ userId, isAdmin, trackColor, instructorId, courseId }: { userId: string; isAdmin: boolean; trackColor?: string; instructorId?: string; courseId?: number }) {
  const color = trackColor || '#D59C10';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [admins, setAdmins] = useState<InstructorOption[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    loadContacts();
    if (!isAdmin) loadInstructors();
  }, [userId]);

  useEffect(() => {
    if (!selectedKey) return;
    const selected = contacts.find(contact => contact.key === selectedKey) || admins.find(option => `${option.id}:${option.courseId}` === selectedKey);
    if (selected) loadThread(selected.id, 'courseId' in selected ? selected.courseId : null);
  }, [selectedKey, contacts, admins]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const loadInstructors = async () => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data: enrollments } = await supabase.from('enrollments').select('course_id').eq('user_id', userId);
    let courseIds = (enrollments || []).map((enrollment: any) => Number(enrollment.course_id));
    if (courseId && !courseIds.includes(courseId)) courseIds = [courseId, ...courseIds];
    if (!courseIds.length) { setAdmins([]); return; }
    const { data: courses } = await supabase.from('courses').select('id,title,created_by,instructor_ids').in('id', courseIds);
    const instructorIds = [...new Set((courses || []).flatMap((course: any) => [
      course.created_by,
      ...(Array.isArray(course.instructor_ids) ? course.instructor_ids : []),
    ]).filter(Boolean))] as string[];
    const { data: profiles } = instructorIds.length
      ? await supabase.from('profiles').select('id,full_name').in('id', instructorIds)
      : { data: [] as any[] };
    const names = Object.fromEntries((profiles || []).map((profile: any) => [profile.id, profile.full_name || 'Instructor']));
    const options: InstructorOption[] = [];
    for (const course of courses || []) {
      const ids = [...new Set([course.created_by, ...(Array.isArray(course.instructor_ids) ? course.instructor_ids : [])].filter(Boolean))] as string[];
      for (const id of ids) options.push({ id, name: names[id] || 'Instructor', courseId: Number(course.id), courseTitle: course.title });
    }
    if (instructorId && courseId && !options.some(option => option.id === instructorId && option.courseId === courseId)) {
      const { data } = await supabase.from('profiles').select('id,full_name').eq('id', instructorId).single();
      if (data) options.unshift({ id: data.id, name: data.full_name || 'Instructor', courseId, courseTitle: 'Current course' });
    }
    setAdmins(options);
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
    const courseIds = [...new Set(data.map((m: any) => m.course_id).filter(Boolean))];
    const { data: courses } = courseIds.length ? await supabase.from('courses').select('id,title').in('id', courseIds) : { data: [] as any[] };
    const courseMap = Object.fromEntries((courses || []).map((course: any) => [course.id, course.title]));

    const contactMap: Record<string, Contact> = {};
    for (const m of data) {
      const otherId = m.sender_id === userId ? m.recipient_id : m.sender_id;
      const key = `${otherId}:${m.course_id || 'general'}`;
      if (!contactMap[key]) {
        contactMap[key] = { key, id: otherId, name: nameMap[otherId] || 'User', unread: 0, lastMessage: m.content, lastAt: m.created_at, courseId: m.course_id || null, courseTitle: courseMap[m.course_id] || 'General Academy' };
      }
      if (!m.read && m.recipient_id === userId) contactMap[key].unread++;
    }
    setContacts(Object.values(contactMap));
  };

  const loadThread = async (otherId: string, selectedCourseId: number | null) => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${userId})`)
      .filter('course_id', selectedCourseId ? 'eq' : 'is', selectedCourseId ? selectedCourseId : null)
      .order('created_at', { ascending: true });

    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', [userId, otherId]);
    const nameMap: Record<string, string> = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name || 'User']));
    setThread((data || []).map((m: any) => ({ ...m, sender_name: nameMap[m.sender_id] || 'User' })));

    const unreadIds = (data || []).filter((m: any) => !m.read && m.recipient_id === userId).map((m: any) => m.id);
    if (unreadIds.length) {
      await supabase.from('messages').update({ read: true }).in('id', unreadIds);
      setContacts(prev => prev.map(c => c.id === otherId && c.courseId === selectedCourseId ? { ...c, unread: 0 } : c));
    }
  };

  const sendMessage = async () => {
    const selected = contacts.find(contact => contact.key === selectedKey) || admins.find(option => `${option.id}:${option.courseId}` === selectedKey);
    if (!draft.trim() || !selected) return;
    setSending(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const selectedCourseId = 'courseId' in selected ? selected.courseId : null;
    await supabase.from('messages').insert({ sender_id: userId, recipient_id: selected.id, course_id: selectedCourseId, content: draft.trim() });
    setDraft('');
    await loadThread(selected.id, selectedCourseId);
    await loadContacts();
    setSending(false);
  };

  const startNewChat = (option: InstructorOption) => {
    const key = `${option.id}:${option.courseId}`;
    setSelectedKey(key);
    if (!contacts.find(contact => contact.key === key)) {
      setContacts(previous => [{ key, id: option.id, name: option.name, unread: 0, lastMessage: '', lastAt: '', courseId: option.courseId, courseTitle: option.courseTitle }, ...previous]);
    }
  };

  const selectedContact = contacts.find(contact => contact.key === selectedKey) || admins.find(option => `${option.id}:${option.courseId}` === selectedKey);
  const totalUnread = contacts.reduce((s, c) => s + c.unread, 0);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 500, border: '1px solid #2A2F35', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ width: 240, borderRight: '1px solid #2A2F35', display: 'flex', flexDirection: 'column', background: '#1A1D21', flexShrink: 0 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #2A2F35' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Messages {totalUnread > 0 && <span style={{ background: '#F87171', color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 5px', marginLeft: 4 }}>{totalUnread}</span>}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {contacts.map(c => {
            const isInstructor = !isAdmin && admins.find(a => a.id === c.id);
            return (
              <div key={c.key} onClick={() => setSelectedKey(c.key)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #2A2F35', background: selectedKey === c.key ? 'rgba(213,156,16,0.06)' : 'transparent', borderLeft: selectedKey === c.key ? `2px solid ${color}` : '2px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}>{c.name}</span>
                  {c.unread > 0 && <span style={{ background: color, color: '#1A1D21', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 5px', fontFamily: 'JetBrains Mono, monospace' }}>{c.unread}</span>}
                </div>
                {isInstructor && <div style={{ fontSize: 10, color: color, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Your Instructor</div>}
                <div style={{ fontSize: 10, color, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.courseTitle}</div>
                {c.lastMessage && (
                  <>
                    <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</div>
                    {c.lastAt && (
                      <div style={{ fontSize: 9, color: '#4B5563', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatMessageTimestamp(c.lastAt)}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {!isAdmin && admins.filter(a => !contacts.find(c => c.key === `${a.id}:${a.courseId}`)).map(a => (
            <div key={`${a.id}:${a.courseId}`} onClick={() => startNewChat(a)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #2A2F35' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5', marginBottom: 2 }}>{a.name}</div>
              <div style={{ fontSize: 10, color: color, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Your Instructor</div>
              <div style={{ fontSize: 10, color, marginBottom: 2 }}>{a.courseTitle}</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>Start a conversation</div>
            </div>
          ))}

          {contacts.length === 0 && admins.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>No messages yet</div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#22262B' }}>
        {!selectedKey ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3A3F46', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
            Select a conversation
          </div>
        ) : (
          <>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #2A2F35', color: '#F5F5F5' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedContact?.name || 'Conversation'}</div>
              <div style={{ fontSize: 11, color, marginTop: 2 }}>{selectedContact?.courseTitle || 'General Academy'}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {thread.map((m, index) => {
                const mine = m.sender_id === userId;
                const previousMessage = index > 0 ? thread[index - 1] : null;
                const showDateSeparator = !previousMessage || calendarDay(previousMessage.created_at) !== calendarDay(m.created_at);
                return (
                  <div key={m.id}>
                    {showDateSeparator && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: index === 0 ? '2px 0 14px' : '12px 0 14px' }}>
                        <div style={{ height: 1, background: '#2A2F35', flex: 1 }} />
                        <span style={{ color: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>{formatDateLabel(m.created_at)}</span>
                        <div style={{ height: 1, background: '#2A2F35', flex: 1 }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '75%' }}>
                        {!mine && <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 3, fontFamily: 'JetBrains Mono, monospace' }}>{m.sender_name}</div>}
                        <div style={{ padding: '9px 14px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: mine ? color : '#1A1D21', color: mine ? '#1A1D21' : '#F5F5F5', fontSize: 13, lineHeight: 1.5, fontWeight: mine ? 500 : 400 }}>
                          {m.content}
                        </div>
                        <div title={formatMessageTimestamp(m.created_at)} style={{ fontSize: 10, color: '#3A3F46', marginTop: 3, textAlign: mine ? 'right' : 'left', fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
                          {formatMessageTimestamp(m.created_at)}
                          {mine && (
                            <span style={{ color: m.read ? '#4E8FD4' : '#6B7280', fontSize: 12, letterSpacing: '-3px', lineHeight: 1 }}>
                              {m.read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
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
