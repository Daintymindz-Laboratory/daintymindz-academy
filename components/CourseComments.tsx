'use client';
import { useState, useEffect } from 'react';

type Comment = {
  id: number;
  user_id: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  author_name: string;
};

export default function CourseComments({ courseId, userId, trackColor }: { courseId: number; userId: string; trackColor: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (!courseId) return;
    load();
  }, [courseId]);

  const load = async () => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data: commentsData } = await supabase
      .from('course_comments')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });
    if (!commentsData || commentsData.length === 0) { setComments([]); return; }

    const userIds = [...new Set(commentsData.map((c: any) => c.user_id as string))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
    const nameMap: Record<string, string> = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name || 'Student']));
    setComments(commentsData.map((c: any) => ({ ...c, author_name: nameMap[c.user_id] || 'Student' })));
  };

  const post = async (content: string, parentId: number | null) => {
    if (!content.trim()) return;
    setPosting(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('course_comments').insert({ course_id: courseId, user_id: userId, parent_id: parentId, content: content.trim() });
    setNewComment('');
    setReplyText('');
    setReplyTo(null);
    await load();
    setPosting(false);
  };

  const saveEdit = async (id: number) => {
    if (!editText.trim()) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('course_comments').update({ content: editText.trim() }).eq('id', id);
    setEditingId(null);
    setEditText('');
    await load();
  };

  const deleteComment = async (id: number) => {
    if (!confirm('Delete this comment?')) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('course_comments').delete().eq('id', id);
    await load();
  };

  const topLevel = comments.filter(c => !c.parent_id);
  const replies = (parentId: number) => comments.filter(c => c.parent_id === parentId);
  const avatar = (name: string) => name.slice(0, 1).toUpperCase();

  const CommentItem = ({ c, depth = 0 }: { c: Comment; depth?: number }) => (
    <div style={{ marginLeft: depth > 0 ? 36 : 0 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${trackColor}20`, border: `1px solid ${trackColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: trackColor, flexShrink: 0 }}>{avatar(c.author_name)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}>{c.author_name}</span>
            <span style={{ fontSize: 11, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>
              {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {c.user_id === userId && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button onClick={() => { setEditingId(c.id); setEditText(c.content); }} style={{ background: 'none', border: 'none', fontSize: 11, color: '#6B7280', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>Edit</button>
                <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#EF4444', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>Delete</button>
              </div>
            )}
          </div>

          {editingId === c.id ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <textarea
                name="edit-comment"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={2}
                style={{ flex: 1, background: '#1A1D21', border: `1px solid ${trackColor}60`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => saveEdit(c.id)} style={{ background: trackColor, border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{ background: 'none', border: '1px solid #2A2F35', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ margin: '0 0 6px', fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>{c.content}</p>
          )}

          {depth === 0 && editingId !== c.id && (
            <button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} style={{ background: 'none', border: 'none', fontSize: 12, color: '#6B7280', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>
              {replyTo === c.id ? 'Cancel' : 'Reply'}
            </button>
          )}
        </div>
      </div>

      {replyTo === c.id && (
        <div style={{ marginLeft: 42, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              name="comment-reply"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              style={{ flex: 1, background: '#1A1D21', border: '1px solid #2A2F35', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none' }}
            />
            <button onClick={() => post(replyText, c.id)} disabled={posting || !replyText.trim()} style={{ background: trackColor, border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: posting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', alignSelf: 'stretch' }}>
              {posting ? '...' : 'Reply'}
            </button>
          </div>
        </div>
      )}

      {replies(c.id).map(r => <CommentItem key={r.id} c={r} depth={1} />)}
    </div>
  );

  return (
    <div style={{ borderTop: '1px solid #2A2F35', paddingTop: 28, marginTop: 28 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// discussion'}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F5', margin: '0 0 20px' }}>Course Discussion ({comments.length})</h3>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <textarea
          name="new-comment"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Ask a question or share something with your classmates..."
          rows={3}
          style={{ flex: 1, background: '#22262B', border: '1px solid #2A2F35', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none', lineHeight: 1.6 }}
        />
        <button onClick={() => post(newComment, null)} disabled={posting || !newComment.trim()} style={{ background: trackColor, border: 'none', borderRadius: 10, padding: '0 20px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: (posting || !newComment.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', alignSelf: 'stretch', opacity: !newComment.trim() ? 0.5 : 1 }}>
          {posting ? '...' : 'Post'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {topLevel.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>No comments yet. Be the first!</div>
        ) : (
          topLevel.map(c => <CommentItem key={c.id} c={c} />)
        )}
      </div>
    </div>
  );
}
