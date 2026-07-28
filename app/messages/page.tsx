'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import MessageCenter from '@/components/MessageCenter';
import NotificationBell from '@/components/NotificationBell';

export default function MessagesPage() {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dm-sidebar-collapsed') === '1';
    return false;
  });

  useEffect(() => {
    const loadUser = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/signin';
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, is_admin')
        .eq('id', user.id)
        .single();
      setUserId(user.id);
      setUserName(profile?.full_name || user.email || 'User');
      setIsAdmin(!!profile?.is_admin);
      setLoading(false);
    };
    loadUser();
  }, []);

  const toggleCollapse = () => {
    setSidebarCollapsed(collapsed => {
      const next = !collapsed;
      localStorage.setItem('dm-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  };

  if (loading) return (
    <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D59C10', fontSize: 13 }}>Loading messages...</div>
    </div>
  );

  const navigation = [
    { icon: '⊞', label: 'Dashboard', href: '/dashboard' },
    { icon: '◎', label: 'My Courses', href: '/my-courses' },
    { icon: '✦', label: 'Catalog', href: '/catalog' },
    { icon: '◈', label: 'Certificates', href: '/certificates' },
    { icon: '✉', label: 'Messages', href: '/messages', active: true },
    ...(isAdmin ? [{ icon: '⚙', label: 'Admin Panel', href: '/admin' }] : []),
  ];

  return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <nav style={{
        height: 64, background: '#1A1D21', borderBottom: '1px solid #2A2F35',
        display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 16,
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      }}>
        <button onClick={() => { if (window.innerWidth < 769) setSidebarOpen(open => !open); else toggleCollapse(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 20, padding: 4 }}>☰</button>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={100} height={36} style={{ objectFit: 'contain' }} />
          <span className="dm-nav-academy" style={{ fontSize: 14, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 8 }}>Academy</span>
        </a>
        <div style={{ flex: 1 }} />
        <span className="dm-hide-mobile" style={{ fontSize: 13, color: '#6B7280' }}>{userName}</span>
        <NotificationBell userId={userId} />
      </nav>

      <div style={{ display: 'flex', minHeight: '100vh', paddingTop: 64 }}>
        <div className={`dm-sidebar-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`dm-sidebar${sidebarOpen ? ' open' : ''}${sidebarCollapsed ? ' dm-collapsed' : ''}`} style={{ padding: '1.5rem 0' }}>
          <div style={{ padding: '0 1rem' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Navigation</div>
            {navigation.map(item => (
              <a key={item.label} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 10, marginBottom: 2, textDecoration: 'none',
                background: item.active ? 'rgba(213,156,16,0.08)' : 'transparent',
                border: item.active ? '1px solid rgba(213,156,16,0.15)' : '1px solid transparent',
                color: item.active ? '#D59C10' : '#6B7280',
                fontSize: 14, fontWeight: item.active ? 600 : 400,
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
        </aside>

        <main className={`dm-main${sidebarCollapsed ? ' dm-collapsed' : ''}`} style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// messages'}</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5' }}>Messages</h1>
            <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
              {isAdmin ? 'Direct messages with students and instructors' : 'Contact your instructors and academy administrators'}
            </p>
          </div>
          <div style={{ height: 'calc(100vh - 190px)', minHeight: 520 }}>
            <MessageCenter userId={userId} isAdmin={isAdmin} trackColor="#D59C10" />
          </div>
        </main>
      </div>
    </div>
  );
}
