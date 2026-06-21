'use client';
import Image from 'next/image';
import { useState } from 'react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { setError(error.message); setLoading(false); return; }
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif' }}>

      <nav style={{ borderBottom: '1px solid #2A2F35', padding: '0 2.5rem', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={110} height={40} style={{ objectFit: 'contain' }} />
          <span className="dm-nav-academy" style={{ fontSize: 15, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 10 }}>Academy</span>
        </a>
        <a href="/signin" style={{ color: '#6B7280', fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>Back to sign in</a>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(76,175,125,0.12)', border: '1px solid rgba(76,175,125,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, margin: '0 auto 24px',
              }}>✓</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', marginBottom: 12, letterSpacing: '-0.02em' }}>Check your email</h2>
              <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.8, marginBottom: 32 }}>
                We sent a password reset link to <strong style={{ color: '#F5F5F5' }}>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <a href="/signin" style={{
                display: 'block', textAlign: 'center',
                background: 'transparent', border: '1px solid #3A3F46',
                color: '#F5F5F5', padding: '13px 0', borderRadius: 50,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
              }}>Back to sign in</a>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>
                {'// reset password'}
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: '#F5F5F5', marginBottom: 8, letterSpacing: '-0.02em' }}>Forgot your password?</h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 36, lineHeight: 1.7 }}>
                Enter your email address and we will send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={{ width: '100%', height: 48, background: '#22262B', border: '1px solid #3A3F46', borderRadius: 12, padding: '0 16px', fontSize: 14, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#D59C10')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#3A3F46')}
                  />
                </div>

                {error && (
                  <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '10px 14px', color: '#F87171', fontSize: 13, marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{ width: '100%', height: 50, background: loading ? '#A37808' : '#D59C10', border: 'none', borderRadius: 50, fontSize: 15, fontWeight: 700, color: '#1A1D21', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'background 0.2s' }}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: '#6B7280' }}>
                Remember it?{' '}
                <a href="/signin" style={{ color: '#D59C10', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
