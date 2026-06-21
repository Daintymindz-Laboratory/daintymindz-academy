'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase puts the session tokens in the URL hash after redirect
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session means the link is invalid or expired
        setError('This reset link is invalid or has expired. Please request a new one.');
      } else {
        setReady(true);
      }
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(error.message); setLoading(false); return; }
      setDone(true);
      setTimeout(() => { window.location.href = '/dashboard'; }, 2500);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif' }}>

      <nav style={{ borderBottom: '1px solid #2A2F35', padding: '0 2.5rem', height: 68, display: 'flex', alignItems: 'center' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={110} height={40} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 15, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 10 }}>Academy</span>
        </a>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(76,175,125,0.12)', border: '1px solid rgba(76,175,125,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 24px' }}>✓</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', marginBottom: 12, letterSpacing: '-0.02em' }}>Password updated</h2>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.8 }}>Your password has been changed. Redirecting you to the dashboard...</p>
            </div>
          ) : error && !ready ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 24px' }}>✕</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', marginBottom: 12, letterSpacing: '-0.02em' }}>Link expired</h2>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.8, marginBottom: 32 }}>{error}</p>
              <a href="/forgot-password" style={{ display: 'block', textAlign: 'center', background: '#D59C10', border: 'none', color: '#1A1D21', padding: '13px 0', borderRadius: 50, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                Request new link
              </a>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
                {'// new password'}
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#F5F5F5', marginBottom: 8, letterSpacing: '-0.02em' }}>Set a new password</h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 36 }}>Must be at least 8 characters.</p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ width: '100%', height: 48, background: '#22262B', border: '1px solid #3A3F46', borderRadius: 12, padding: '0 16px', fontSize: 14, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#D59C10')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#3A3F46')}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ width: '100%', height: 48, background: '#22262B', border: '1px solid #3A3F46', borderRadius: 12, padding: '0 16px', fontSize: 14, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#D59C10')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#3A3F46')}
                  />
                </div>

                {error && ready && (
                  <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '10px 14px', color: '#F87171', fontSize: 13, marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || !ready} style={{ width: '100%', height: 50, background: loading ? '#A37808' : '#D59C10', border: 'none', borderRadius: 50, fontSize: 15, fontWeight: 700, color: '#1A1D21', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'background 0.2s' }}>
                  {loading ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
