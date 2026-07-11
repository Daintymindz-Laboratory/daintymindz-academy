'use client';
import { useState } from 'react';

export default function CourseRating({
  courseId,
  userId,
  courseTitle,
  trackColor,
  onDone,
}: {
  courseId: number;
  userId: string;
  courseTitle: string;
  trackColor: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (rating === 0) return;
    setSaving(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('course_ratings').upsert(
      { course_id: courseId, user_id: userId, rating, comment: comment.trim() || null },
      { onConflict: 'course_id,user_id' }
    );
    onDone();
  };

  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#22262B', border: '1px solid #2A2F35', borderRadius: 20,
        padding: '36px 32px', maxWidth: 440, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: trackColor, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>Course complete</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F5F5F5', margin: '0 0 6px' }}>You did it!</h2>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 28px', lineHeight: 1.6 }}>How would you rate <strong style={{ color: '#9CA3AF' }}>{courseTitle}</strong>?</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                fontSize: 36, lineHeight: 1,
                filter: s <= (hovered || rating) ? 'none' : 'grayscale(1) opacity(0.3)',
                transform: s <= (hovered || rating) ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.1s',
              }}
            >
              {s <= (hovered || rating) ? '⭐' : '☆'}
            </button>
          ))}
        </div>
        {(hovered || rating) > 0 && (
          <div style={{ fontSize: 12, color: trackColor, fontFamily: 'JetBrains Mono, monospace', marginBottom: 20, height: 16 }}>
            {labels[hovered || rating]}
          </div>
        )}
        {!(hovered || rating) && <div style={{ height: 36 }} />}

        <textarea
          name="rating-comment"
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Any feedback? (optional)"
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#1A1D21', border: '1px solid #2A2F35', borderRadius: 10,
            padding: '10px 14px', fontSize: 13, color: '#F5F5F5',
            fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none',
            lineHeight: 1.6, marginBottom: 20,
          }}
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onDone}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid #2A2F35',
              background: 'transparent', color: '#6B7280', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Skip
          </button>
          <button
            onClick={submit}
            disabled={rating === 0 || saving}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
              background: rating === 0 ? '#2A2F35' : trackColor,
              color: rating === 0 ? '#6B7280' : '#1A1D21',
              fontSize: 13, fontWeight: 700, cursor: rating === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans, sans-serif', transition: 'background 0.2s',
            }}
          >
            {saving ? 'Saving...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
}
