'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

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
  const [postingNew, setPostingNew] = useState(false);
  const [postingReply, setPostingReply] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (replyTo !== null) {
      setTimeout(() => replyRef.current?.focus(), 50);
    }
  }, [replyTo]);

  useEffect(() => {
    if (!courseId) return;
    load();
  }, [courseId]);

  const load = useCallback(async () => {
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
  }, [courseId]);

  const postNew = async () => {
    if (!newComment.trim() || postingNew) return;
    setPostingNew(true);
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { error } = await supabase.from('course_comments').insert({ course_id: courseId, user_id: userId, parent_id: null, content: newComment.trim() });
      if (!error) { setNewComment(''); await load(); }
    } finally {
      setPostingNew(false);
    }
  };

  const postReply = async (parentId: number) => {
    if (!replyText.trim() || postingReply) return;
    setPostingReply(true);
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { error } = await supabase.from('course_comments').insert({ course_id: courseId, user_id: userId, parent_id: parentId, content: replyText.trim() });
      if (!error) { setReplyText(''); setReplyTo(null); await load(); }
    } finally {
      setPostingReply(false);
    }
  };

  const saveEdit = async (id: number) => {
    if (!editText.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      await supabase.from('course_comments').update({ content: editText.trim() }).eq('id', id);
      setEditingId(null);
      setEditText('');
      await load();
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteComment = async (id: number) => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('course_comments').delete().eq('id', id);
    setConfirmDeleteId(null);
    await load();
  };

  const topLevel = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: number) => comments.filter(c => c.parent_id === parentId);
  const avatar = (name: string) => name.slice(0, 1).toUpperCase();

  return (
    <div style={{ borderTop: '1px solid #2A2F35', paddingTop: 28, marginTop: 28 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// discussion'}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F5', margin: '0 0 20px' }}>Course Discussion ({comments.length})</h3>

      {/* New comment box */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <textarea
          name="new-comment"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) postNew(); }}
          placeholder="Ask a question or share something with your classmates..."
          rows={3}
          style={{ flex: 1, background: '#22262B', border: '1px solid #2A2F35', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none', lineHeight: 1.6 }}
        />
        <button
          onClick={postNew}
          disabled={postingNew || !newComment.trim()}
          style={{ background: trackColor, border: 'none', borderRadius: 10, padding: '0 20px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: (postingNew || !newComment.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', alignSelf: 'stretch', opacity: !newComment.trim() ? 0.5 : 1 }}
        >
          {postingNew ? '...' : 'Post'}
        </button>
      </div>

      {/* Comment list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {topLevel.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>No comments yet. Be the first!</div>
        ) : topLevel.map(c => (
          <div key={c.id}>
            {/* Top-level comment */}
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
                      <button onClick={() => { setEditingId(c.id); setEditText(c.content); setReplyTo(null); }} style={{ background: 'none', border: 'none', fontSize: 11, color: '#6B7280', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>Edit</button>
                      <button onClick={() => setConfirmDeleteId(c.id)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#EF4444', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>Delete</button>
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
                      <button onClick={() => saveEdit(c.id)} disabled={savingEdit || !editText.trim()} style={{ background: trackColor, border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#1A1D21', cursor: savingEdit ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{savingEdit ? '...' : 'Save'}</button>
                      <button onClick={() => { setEditingId(null); setEditText(''); }} style={{ background: 'none', border: '1px solid #2A2F35', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: '0 0 6px', fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>{c.content}</p>
                )}

                {editingId !== c.id && (
                  <button onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(''); setEditingId(null); }} style={{ background: 'none', border: 'none', fontSize: 12, color: '#6B7280', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>
                    {replyTo === c.id ? 'Cancel' : 'Reply'}
                  </button>
                )}
              </div>
            </div>

            {/* Inline delete confirm */}
            {confirmDeleteId === c.id && (
              <div style={{ marginLeft: 42, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                <span style={{ fontSize: 12, color: '#FCA5A5', flex: 1 }}>Delete this comment?</span>
                <button onClick={() => deleteComment(c.id)} style={{ background: '#EF4444', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Delete</button>
                <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'none', border: '1px solid #2A2F35', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
              </div>
            )}

            {/* Reply input */}
            {replyTo === c.id && (
              <div style={{ marginLeft: 42, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    ref={replyRef}
                    name="comment-reply"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    style={{ flex: 1, background: '#1A1D21', border: `1px solid ${trackColor}40`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => postReply(c.id)}
                    disabled={postingReply || !replyText.trim()}
                    style={{ background: replyText.trim() ? trackColor : '#2A2F35', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 700, color: replyText.trim() ? '#1A1D21' : '#6B7280', cursor: (postingReply || !replyText.trim()) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', alignSelf: 'stretch' }}
                  >
                    {postingReply ? '...' : 'Reply'}
                  </button>
                </div>
              </div>
            )}

            {/* Nested replies */}
            {getReplies(c.id).map(r => (
              <div key={r.id} style={{ marginLeft: 36 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${trackColor}15`, border: `1px solid ${trackColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: trackColor, flexShrink: 0 }}>{avatar(r.author_name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}>{r.author_name}</span>
                      <span style={{ fontSize: 11, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {r.user_id === userId && (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                          <button onClick={() => { setEditingId(r.id); setEditText(r.content); }} style={{ background: 'none', border: 'none', fontSize: 11, color: '#6B7280', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>Edit</button>
                          <button onClick={() => setConfirmDeleteId(r.id)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#EF4444', cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}>Delete</button>
                        </div>
                      )}
                    </div>
                    {editingId === r.id ? (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <textarea
                          name="edit-reply"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={2}
                          autoFocus
                          style={{ flex: 1, background: '#1A1D21', border: `1px solid ${trackColor}60`, borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', resize: 'none', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button onClick={() => saveEdit(r.id)} disabled={savingEdit || !editText.trim()} style={{ background: trackColor, border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#1A1D21', cursor: savingEdit ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{savingEdit ? '...' : 'Save'}</button>
                          <button onClick={() => { setEditingId(null); setEditText(''); }} style={{ background: 'none', border: '1px solid #2A2F35', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: '0 0 6px', fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>{r.content}</p>
                    )}
                    {confirmDeleteId === r.id && (
                      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
                        <span style={{ fontSize: 12, color: '#FCA5A5', flex: 1 }}>Delete this reply?</span>
                        <button onClick={() => deleteComment(r.id)} style={{ background: '#EF4444', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Delete</button>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ background: 'none', border: '1px solid #2A2F35', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
