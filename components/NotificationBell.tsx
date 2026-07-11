'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
};

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setNotifications(data);

      supabase
        .channel(`notifications:${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => setNotifications(prev => [payload.new as Notification, ...prev])
        )
        .subscribe();
    };
    load();
  }, [userId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const typeIcon: Record<string, string> = {
    project_submitted: '📬',
    submission_approved: '✅',
    submission_rework: '↩️',
    course_completed: '🎓',
    message: '💬',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', position: 'relative', display: 'flex', alignItems: 'center' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -2, right: -2, background: '#F87171', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', fontFamily: 'JetBrains Mono, monospace' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #2A2F35', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#F5F5F5' }}>Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background: 'none', border: 'none', fontSize: 11, color: '#D59C10', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Mark all read</button>
            )}
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} onClick={() => handleClick(n)} style={{ padding: '12px 18px', borderBottom: '1px solid #2A2F35', cursor: n.link ? 'pointer' : 'default', background: n.read ? 'transparent' : 'rgba(213,156,16,0.04)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{typeIcon[n.type] || '🔔'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: '#F5F5F5', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                      {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D59C10', flexShrink: 0, marginTop: 5 }} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
