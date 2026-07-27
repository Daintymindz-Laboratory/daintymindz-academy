'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function PendingApprovalPage() {
  const [status, setStatus] = useState<'loading' | 'pending' | 'rejected' | 'signed_out'>('loading');

  useEffect(() => {
    void (async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('signed_out'); return; }
      const { data } = await supabase.from('profiles').select('approval_status').eq('id', user.id).maybeSingle();
      if (data?.approval_status === 'approved') { window.location.href = '/dashboard'; return; }
      setStatus(data?.approval_status === 'rejected' ? 'rejected' : 'pending');
    })();
  }, []);

  const signOut = async () => {
    const { createClient } = await import('@/lib/supabase');
    await createClient().auth.signOut();
    window.location.href = '/signin';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1A1D21', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#22262B', border: '1px solid #2A2F35', borderRadius: 20, padding: '2.5rem', textAlign: 'center' }}>
        <Image src="/logo.png" alt="Daintymindz" width={120} height={44} style={{ objectFit: 'contain', marginBottom: 24 }} />
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: status === 'rejected' ? '#F87171' : '#D59C10', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
          {status === 'rejected' ? 'Access declined' : 'Internal access review'}
        </div>
        <h1 style={{ fontSize: 24, color: '#F5F5F5', marginBottom: 12 }}>
          {status === 'rejected' ? 'Your request was not approved' : 'Your account is awaiting approval'}
        </h1>
        <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7, marginBottom: 26 }}>
          {status === 'signed_out'
            ? 'Sign in to check the status of your Academy access request.'
            : status === 'rejected'
              ? 'Please contact a Daintymindz Academy administrator if you believe this decision was made in error.'
              : 'Daintymindz Academy is an internal learning platform. An administrator must approve your account before you can access courses, discussions, or certificates.'}
        </p>
        {status === 'signed_out' ? (
          <a href="/signin" style={{ display: 'inline-block', background: '#D59C10', color: '#1A1D21', padding: '10px 28px', borderRadius: 50, textDecoration: 'none', fontWeight: 700 }}>Sign in</a>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            <button onClick={() => window.location.reload()} style={{ background: '#D59C10', border: 'none', color: '#1A1D21', padding: '10px 24px', borderRadius: 50, fontWeight: 700, cursor: 'pointer' }}>Check again</button>
            <button onClick={signOut} style={{ background: 'transparent', border: '1px solid #3A3F46', color: '#9CA3AF', padding: '10px 24px', borderRadius: 50, cursor: 'pointer' }}>Sign out</button>
          </div>
        )}
      </div>
    </div>
  );
}
