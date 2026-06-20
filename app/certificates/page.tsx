'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';

type Certificate = {
  id: number;
  cert_id: string;
  issued_at: string;
  course: {
    title: string;
    track: string;
    level: string;
  };
};

const TRACKS: Record<string, { label: string; color: string; glow: string }> = {
  AI: { label: 'Artificial Intelligence', color: '#D59C10', glow: 'rgba(213,156,16,0.15)' },
  DS: { label: 'Data Science & Analytics', color: '#4E8FD4', glow: 'rgba(78,143,212,0.15)' },
  SE: { label: 'Software Engineering', color: '#4CAF7D', glow: 'rgba(76,175,125,0.15)' },
  DO: { label: 'Data Operations', color: '#9B6FD4', glow: 'rgba(155,111,212,0.15)' },
};

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/signin'; return; }

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('full_name, is_admin').eq('id', user.id).single();
      if (profileError) console.error('Profile fetch error:', profileError);
      if (profile) {
        setUserName(profile.full_name);
        setIsAdmin(!!profile.is_admin);
      }

      const { data: certsData } = await supabase
        .from('certificates')
        .select('*, course:courses(title, track, level)')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (certsData) setCerts(certsData);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return (
    <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D59C10', fontSize: 13 }}>Loading certificates...</div>
    </div>
  );

  return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{
        height: 64, background: '#1A1D21', borderBottom: '1px solid #2A2F35',
        display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 16,
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      }}>
        <button onClick={() => setSidebarOpen(o => !o)} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 20, padding: 4,
        }}>☰</button>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={100} height={36} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 14, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 8 }}>Academy</span>
        </a>
        <div style={{ flex: 1 }} />
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#D59C10', color: '#1A1D21',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, flexShrink: 0,
        }}>
          {userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, paddingTop: 64 }}>

        <div className={`dm-sidebar-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
        {/* SIDEBAR */}
        <aside className={`dm-sidebar${sidebarOpen ? ' open' : ''}`} style={{ padding: '1.5rem 0' }}>
          <div style={{ padding: '0 1rem' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Navigation</div>
            {[
              { icon: '⊞', label: 'Dashboard', href: '/dashboard' },
              { icon: '◎', label: 'My Courses', href: '/my-courses' },
              { icon: '✦', label: 'Catalog', href: '/catalog' },
              { icon: '◈', label: 'Certificates', href: '/certificates', active: true },
              ...(isAdmin ? [{ icon: '⚙', label: 'Admin Panel', href: '/admin' }] : []),
            ].map(item => (
              <a key={item.label} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                textDecoration: 'none',
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

        {/* MAIN */}
        <main className="dm-main" style={{ flex: 1, marginLeft: 240, padding: '2.5rem', overflowY: 'auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              {'// certificates'}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em', marginBottom: 4 }}>
              My Certificates
            </h1>
            <p style={{ fontSize: 14, color: '#6B7280' }}>
              {certs.length === 0 ? 'Complete a course to earn your first certificate.' : `${certs.length} certificate${certs.length > 1 ? 's' : ''} earned`}
            </p>
          </div>

          {certs.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '5rem 0',
              border: '1px dashed #2A2F35', borderRadius: 20,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F5', marginBottom: 8 }}>No certificates yet</div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
                Complete a course to earn your first certificate.
              </div>
              <a href="/catalog" style={{
                background: '#D59C10', border: 'none', borderRadius: 50,
                padding: '10px 28px', fontSize: 14, fontWeight: 700,
                color: '#1A1D21', textDecoration: 'none', display: 'inline-block',
              }}>Browse courses</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {certs.map(cert => {
                const track = TRACKS[cert.course?.track] || TRACKS.AI;
                return (
                  <div key={cert.id} style={{
                    background: '#22262B', border: '1px solid #2A2F35',
                    borderRadius: 20, padding: '24px',
                    display: 'flex', flexDirection: 'column', gap: 16,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = track.color;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${track.glow}`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2F35';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                    onClick={() => window.location.href = `/certificate/${cert.cert_id}`}
                  >
                    {/* Certificate icon */}
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: `${track.color}15`,
                      border: `1px solid ${track.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28,
                    }}>🎓</div>

                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F5', marginBottom: 6, lineHeight: 1.3 }}>
                        {cert.course?.title}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 10px',
                          borderRadius: 20, fontFamily: 'JetBrains Mono, monospace',
                          background: `${track.color}15`, color: track.color,
                        }}>{cert.course?.track} Track</span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 10px',
                          borderRadius: 20, fontFamily: 'JetBrains Mono, monospace',
                          background: 'rgba(255,255,255,0.05)', color: '#6B7280',
                        }}>{cert.course?.level}</span>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #2A2F35', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>ISSUED</div>
                        <div style={{ fontSize: 13, color: '#F5F5F5', fontWeight: 500 }}>
                          {new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', marginBottom: 3 }}>CERT ID</div>
                        <div style={{ fontSize: 11, color: '#D59C10', fontFamily: 'JetBrains Mono, monospace' }}>
                          {cert.cert_id}
                        </div>
                      </div>
                    </div>

                    <button style={{
                      padding: '9px 0', borderRadius: 50,
                      background: 'rgba(213,156,16,0.08)',
                      border: '1px solid rgba(213,156,16,0.3)',
                      color: '#D59C10', fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    }}>
                      View Certificate
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}