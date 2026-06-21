'use client';
import Image from 'next/image';
import { useState } from 'react';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) { setError(error.message); setLoading(false); return; }
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#1A1D21', minHeight: '100vh',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* NAV */}
      <nav style={{
        borderBottom: '1px solid #2A2F35',
        padding: '0 1.5rem', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={110} height={40} style={{ objectFit: 'contain' }} />
          <span style={{
            fontSize: 15, fontWeight: 300, color: '#6B7280',
            borderLeft: '1px solid #3A3F46', paddingLeft: 10,
          }} className="dm-nav-academy">Academy</span>
        </a>

        <a href="/signup" style={{ color: '#6B7280', fontSize: 14, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>Sign up</a>

      </nav>

      {/* BODY */}
      <div className="dm-auth-body" style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr',
      }}>

        {/* LEFT: branding panel */}
        <div className="dm-auth-left" style={{
          borderRight: '1px solid #2A2F35',
          padding: '4rem',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute', width: 400, height: 400,
            borderRadius: '50%', border: '1px solid #2A2F35',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', width: 600, height: 600,
            borderRadius: '50%', border: '1px solid #22262B',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, color: '#D59C10',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 24,
            }}>
              {'// welcome back'}
            </div>

            <h1 style={{
              fontSize: 40, fontWeight: 700, lineHeight: 1.1,
              color: '#F5F5F5', marginBottom: 16,
              letterSpacing: '-0.02em',
            }}>
              Continue your<br />
              <span style={{ color: '#D59C10' }}>learning journey.</span>
            </h1>

            <p style={{
              fontSize: 15, color: '#6B7280', lineHeight: 1.8,
              maxWidth: 340,
            }}>
              Pick up where you left off. Your courses, progress, and certificates are waiting for you.
            </p>

            {/* Feature list */}
            <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {[
                'Courses from beginner to advanced',
                'Hands-on projects in every track',
                'Verified certificate on completion',
              ].map(f => (

                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(213,156,16,0.15)',
                    border: '1px solid rgba(213,156,16,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D59C10' }} />
                  </div>
                  <span style={{ fontSize: 14, color: '#6B7280' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: form */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '4rem',
        }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <h2 style={{
              fontSize: 26, fontWeight: 700, color: '#F5F5F5',
              marginBottom: 8, letterSpacing: '-0.02em',
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 36 }}>
              Enter your credentials to access your dashboard.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600,
                  color: '#6B7280', letterSpacing: '0.06em',
                  textTransform: 'uppercase', marginBottom: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: '100%', height: 48,
                    background: '#22262B',
                    border: '1px solid #3A3F46',
                    borderRadius: 12,
                    padding: '0 16px',
                    fontSize: 14, color: '#F5F5F5',
                    fontFamily: 'DM Sans, sans-serif',
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#D59C10')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#3A3F46')}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 12 }}>
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 600,
                  color: '#6B7280', letterSpacing: '0.06em',
                  textTransform: 'uppercase', marginBottom: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', height: 48,
                    background: '#22262B',
                    border: '1px solid #3A3F46',
                    borderRadius: 12,
                    padding: '0 16px',
                    fontSize: 14, color: '#F5F5F5',
                    fontFamily: 'DM Sans, sans-serif',
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#D59C10')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#3A3F46')}
                />
              </div>

              {/* Forgot password */}
              <div style={{ textAlign: 'right', marginBottom: 28 }}>
                <a href="/forgot-password" style={{
                  fontSize: 13, color: '#6B7280', textDecoration: 'none',
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#D59C10')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
                >
                  Forgot password?
                </a>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.3)',
                  borderRadius: 10, padding: '10px 14px',
                  color: '#F87171', fontSize: 13, marginBottom: 16,
                }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{ width: '100%', height: 50, background: loading ? '#A37808' : '#D59C10', border: 'none', borderRadius: 50, fontSize: 15, fontWeight: 700, color: '#1A1D21', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'background 0.2s' }}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#2A2F35' }} />
              <span style={{ fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#2A2F35' }} />
            </div>

            <button onClick={handleGoogle} style={{
              width: '100%', height: 48, background: '#22262B',
              border: '1px solid #3A3F46', borderRadius: 50,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 14, color: '#F5F5F5', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', marginBottom: 24,
            }}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continue with Google
            </button>

            <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280' }}>
              New to Daintymindz Academy?{' '}
              <a href="/signup" style={{
                color: '#D59C10', fontWeight: 600, textDecoration: 'none',
              }}>
                Create an account
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}