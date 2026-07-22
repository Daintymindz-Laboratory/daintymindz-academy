'use client';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type Comment = {
  id: number;
  user_id: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  author_name: string;
};

type Props = {
  courseId: number;
  lessonId: number;
  userId: string;
  prompt: string;
  trackColor: string;
  isCompleted: boolean;
  onComplete: () => void;
};

async function fetchComments(lessonId: number) {
  const { createClient } = await import('@/lib/supabase');
  const supabase = createClient();
  return supabase.rpc('get_lesson_discussion_comments', { p_lesson_id: lessonId });
}

export default function DiscussionPromptLesson({ courseId, lessonId, userId, prompt, trackColor, isCompleted, onComplete }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [response, setResponse] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetchComments(lessonId).then(({ data, error: loadError }) => {
      if (cancelled) return;
      if (loadError) setError('Discussion prompts need the latest Supabase migration before they can be used.');
      else setComments((data || []) as Comment[]);
    });
    return () => { cancelled = true; };
  }, [lessonId]);

  const submit = async (parentId: number | null) => {
    const text = parentId ? reply.trim() : response.trim();
    if (!text || posting) return;
    setPosting(true);
    setError('');
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { error: insertError } = await supabase.from('course_comments').insert({
      course_id: courseId,
      lesson_id: lessonId,
      user_id: userId,
      parent_id: parentId,
      content: text,
    });
    if (insertError) {
      setError(insertError.message);
    } else {
      if (parentId) { setReply(''); setReplyTo(null); }
      else { setResponse(''); if (!isCompleted) onComplete(); }
      const { data } = await fetchComments(lessonId);
      setComments((data || []) as Comment[]);
    }
    setPosting(false);
  };

  const topLevel = comments.filter(comment => !comment.parent_id);
  const repliesFor = (id: number) => comments.filter(comment => comment.parent_id === id);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '2.25rem', width: '100%' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: trackColor, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>Discussion prompt</div>
        <div style={{ fontSize: 16, color: '#D1D5DB', lineHeight: 1.8, marginBottom: 24 }}>
          <ReactMarkdown>{prompt}</ReactMarkdown>
        </div>

        {isCompleted && (
          <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(76,175,125,0.1)', border: '1px solid rgba(76,175,125,0.3)', color: '#4CAF7D', fontSize: 13, fontWeight: 600, marginBottom: 22 }}>✓ Response submitted. Continue the conversation below.</div>
        )}

        {!isCompleted && (
          <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 14, padding: 18, marginBottom: 28 }}>
            <textarea value={response} onChange={event => setResponse(event.target.value)} rows={5} placeholder="Share your response with the class..." style={{ width: '100%', background: '#1A1D21', border: '1px solid #3A3F46', borderRadius: 10, padding: 14, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={() => submit(null)} disabled={!response.trim() || posting} style={{ background: response.trim() ? trackColor : '#3A3F46', border: 'none', borderRadius: 50, padding: '9px 24px', color: response.trim() ? '#1A1D21' : '#6B7280', fontWeight: 700, cursor: response.trim() ? 'pointer' : 'not-allowed' }}>{posting ? 'Submitting...' : 'Submit response'}</button>
            </div>
          </div>
        )}

        {error && <div style={{ color: '#F87171', fontSize: 12, marginBottom: 16 }}>{error}</div>}

        <h3 style={{ fontSize: 16, color: '#F5F5F5', marginBottom: 18 }}>Class discussion ({comments.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {topLevel.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: '#6B7280', border: '1px dashed #2A2F35', borderRadius: 12 }}>Be the first learner to respond.</div>}
          {topLevel.map(comment => (
            <div key={comment.id} style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <span style={{ color: '#F5F5F5', fontSize: 13, fontWeight: 700 }}>{comment.author_name}</span>
                <span style={{ color: '#6B7280', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>{new Date(comment.created_at).toLocaleDateString()}</span>
              </div>
              <div style={{ color: '#B8BEC7', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{comment.content}</div>
              <button onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setReply(''); }} style={{ marginTop: 10, background: 'none', border: 'none', color: trackColor, padding: 0, cursor: 'pointer', fontSize: 12 }}>Reply</button>
              {replyTo === comment.id && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <textarea value={reply} onChange={event => setReply(event.target.value)} rows={2} placeholder="Write a reply..." style={{ flex: 1, background: '#1A1D21', border: '1px solid #3A3F46', borderRadius: 8, padding: 10, color: '#F5F5F5', resize: 'vertical' }} />
                  <button onClick={() => submit(comment.id)} disabled={!reply.trim() || posting} style={{ background: trackColor, border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 700, cursor: 'pointer' }}>Post</button>
                </div>
              )}
              {repliesFor(comment.id).map(item => (
                <div key={item.id} style={{ marginTop: 12, marginLeft: 22, borderLeft: `2px solid ${trackColor}50`, paddingLeft: 14 }}>
                  <div style={{ color: '#F5F5F5', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{item.author_name}</div>
                  <div style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 1.55 }}>{item.content}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
