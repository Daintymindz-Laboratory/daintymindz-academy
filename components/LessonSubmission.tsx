'use client';
import { useState, useEffect } from 'react';

interface Submission {
  id: number;
  submission_url: string;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  feedback: string | null;
}

interface Props {
  lessonId: number;
  userId: string;
  trackColor: string;
  isCompleted: boolean;
  onComplete: () => void;
}

const inputStyle = {
  width: '100%', height: 42,
  background: '#1A1D21', border: '1px solid #3A3F46',
  borderRadius: 10, padding: '0 14px',
  fontSize: 14, color: '#F5F5F5',
  fontFamily: 'DM Sans, sans-serif', outline: 'none',
};

const labelStyle = {
  display: 'block' as const, fontSize: 11, fontWeight: 600 as const,
  color: '#6B7280', letterSpacing: '0.08em',
  textTransform: 'uppercase' as const, marginBottom: 6,
  fontFamily: 'JetBrains Mono, monospace',
};

export default function LessonSubmission({ lessonId, userId, trackColor, isCompleted, onComplete }: Props) {
  const [loading, setLoading] = useState(!isCompleted);
  const [latest, setLatest] = useState<Submission | null>(null);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isCompleted) return;
    const load = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data } = await supabase
        .from('lesson_submissions')
        .select('id, submission_url, note, status, feedback')
        .eq('user_id', userId).eq('lesson_id', lessonId)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();
      if (data) {
        setLatest(data);
        if (data.status === 'rejected') { setUrl(data.submission_url); setNote(data.note || ''); }
        if (data.status === 'approved') { onComplete(); }
      }
      setLoading(false);
    };
    load();
    // Deliberately omitting onComplete from deps: it's a fresh closure every
    // parent render, and this effect should only re-run on lesson/user change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, userId, isCompleted]);

  const submit = async () => {
    if (!url.trim()) { setError('Please provide a URL.'); return; }
    setError('');
    setSubmitting(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from('lesson_submissions')
      .insert({ user_id: userId, lesson_id: lessonId, submission_url: url.trim(), note: note.trim() || null, status: 'pending' })
      .select('id, submission_url, note, status, feedback')
      .single();
    if (insertError) { setError(insertError.message); setSubmitting(false); return; }
    setLatest(data);
    setSubmitting(false);
  };

  if (isCompleted) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: 12, marginTop: '1.5rem', background: 'rgba(76,175,125,0.08)', border: '1px solid rgba(76,175,125,0.3)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>✓</span>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#4CAF7D' }}>Approved</div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ marginTop: '1.5rem', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#6B7280' }}>Loading submission status...</div>;
  }

  if (latest?.status === 'pending') {
    return (
      <div style={{ marginTop: '1.5rem', padding: '16px 20px', borderRadius: 12, background: '#22262B', border: '1px solid #2A2F35' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', background: 'rgba(213,156,16,0.1)', color: '#D59C10' }}>PENDING REVIEW</span>
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>Submitted: <a href={latest.submission_url} target="_blank" rel="noreferrer" style={{ color: trackColor }}>{latest.submission_url}</a></div>
        {latest.note && <div style={{ fontSize: 13, color: '#6B7280' }}>{latest.note}</div>}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '1.5rem', padding: '20px 24px', borderRadius: 12, background: '#22262B', border: '1px solid #2A2F35' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: trackColor, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>Submit for review</div>

      {latest?.status === 'rejected' && (
        <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#F87171', marginBottom: 4 }}>Changes requested</div>
          {latest.feedback && <div style={{ fontSize: 13, color: '#E5E7EB' }}>{latest.feedback}</div>}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Submission URL *</label>
        <input style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/your-org/repo/pull/123" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Note (optional)</label>
        <textarea
          name="submission-note"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical' as const, lineHeight: 1.6 }}
          placeholder="Anything your reviewer should know..."
        />
      </div>
      {error && <div style={{ fontSize: 12, color: '#F87171', marginBottom: 12 }}>{error}</div>}
      <button onClick={submit} disabled={submitting} style={{
        background: trackColor, border: 'none', borderRadius: 50,
        padding: '9px 24px', fontSize: 13, fontWeight: 700,
        color: '#1A1D21', cursor: submitting ? 'not-allowed' : 'pointer',
        fontFamily: 'DM Sans, sans-serif',
      }}>{submitting ? 'Submitting...' : 'Submit for Review'}</button>
    </div>
  );
}
