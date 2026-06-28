'use client';
import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/lib/user-context';

export default function ProfileButton() {
  const { user, signOut } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: user.avatarUrl ? 'transparent' : '#D59C10',
          color: '#1A1D21', border: user.avatarUrl ? '2px solid #D59C10' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, cursor: 'pointer',
          overflow: 'hidden', padding: 0, flexShrink: 0,
        }}
      >
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initials}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0, zIndex: 200,
          background: '#22262B', border: '1px solid #2A2F35',
          borderRadius: 14, padding: '6px', minWidth: 220,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '10px 12px 12px', borderBottom: '1px solid #2A2F35', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: user.avatarUrl ? 'transparent' : '#D59C10',
                border: user.avatarUrl ? '2px solid #D59C10' : 'none',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, color: '#1A1D21',
              }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>
            </div>
          </div>

          <a href="/dashboard" onClick={() => setOpen(false)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 8, textDecoration: 'none',
            color: '#F5F5F5', fontSize: 13,
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(213,156,16,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 14 }}>⊙</span> Edit Profile
          </a>

          <button onClick={signOut} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '9px 12px', borderRadius: 8, textAlign: 'left',
            background: 'none', border: 'none', color: '#F87171', fontSize: 13, cursor: 'pointer',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 14 }}>→</span> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
