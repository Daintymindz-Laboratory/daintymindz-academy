'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';

type Course = {
  id?: number;
  title: string;
  track: string;
  level: string;
  lessons_count: number;
  duration: string;
  description: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  track: string;
  created_at: string;
};

const TRACKS = {
  AI: { label: 'Artificial Intelligence', color: '#D59C10' },
  DS: { label: 'Data Science & Analytics', color: '#4E8FD4' },
  SE: { label: 'Software Engineering', color: '#4CAF7D' },
  DO: { label: 'Data Operations', color: '#9B6FD4' },
};

const EMPTY_COURSE: Course = {
  title: '', track: 'AI', level: 'Beginner',
  lessons_count: 0, duration: '', description: '',
};

export default function AdminPage() {
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'students'>('courses');
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course>(EMPTY_COURSE);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/signin'; return; }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profile?.is_admin) { window.location.href = '/dashboard'; return; }
      setAdminName(profile.full_name);
      await loadCourses(supabase);
      await loadStudents(supabase);
      setLoading(false);
    };
    init();
  }, []);

  const loadCourses = async (supabase: any) => {
    const { data } = await supabase.from('courses').select('*').order('id');
    if (data) setCourses(data);
  };

  const loadStudents = async (supabase: any) => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setStudents(data);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const saveCourse = async () => {
    if (!editingCourse.title || !editingCourse.description) {
      showToast('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    if (editingCourse.id) {
      await supabase.from('courses').update({
        title: editingCourse.title,
        track: editingCourse.track,
        level: editingCourse.level,
        lessons_count: editingCourse.lessons_count,
        duration: editingCourse.duration,
        description: editingCourse.description,
      }).eq('id', editingCourse.id);
      showToast('Course updated!');
    } else {
      await supabase.from('courses').insert({
        title: editingCourse.title,
        track: editingCourse.track,
        level: editingCourse.level,
        lessons_count: editingCourse.lessons_count,
        duration: editingCourse.duration,
        description: editingCourse.description,
      });
      showToast('Course created!');
    }
    await loadCourses(supabase);
    setShowForm(false);
    setEditingCourse(EMPTY_COURSE);
    setSaving(false);
  };

  const deleteCourse = async (id: number) => {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('courses').delete().eq('id', id);
    await loadCourses(supabase);
    showToast('Course deleted.');
  };

  const inputStyle = {
    width: '100%', height: 42,
    background: '#22262B', border: '1px solid #3A3F46',
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

  if (loading) return (
    <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D59C10', fontSize: 13 }}>Loading admin...</div>
    </div>
  );

  return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>

      {/* NAV */}
      <nav style={{
        height: 60, background: '#1A1D21', borderBottom: '1px solid #2A2F35',
        display: 'flex', alignItems: 'center', padding: '0 2rem', gap: 16,
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      }}>
        <Image src="/logo.png" alt="Daintymindz" width={90} height={32} style={{ objectFit: 'contain' }} />
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 20, padding: '3px 12px', color: '#F87171', letterSpacing: '0.12em',
        }}>ADMIN</div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: '#6B7280' }}>{adminName}</span>
        <a href="/dashboard" style={{
          fontSize: 13, color: '#6B7280', textDecoration: 'none',
          border: '1px solid #2A2F35', borderRadius: 20, padding: '5px 14px',
        }}>Exit admin</a>
      </nav>

      <div style={{ paddingTop: 60, display: 'flex', minHeight: '100vh' }}>

        {/* SIDEBAR */}
        <aside style={{
          width: 220, background: '#1A1D21', borderRight: '1px solid #2A2F35',
          padding: '1.5rem 0', position: 'fixed', top: 60, bottom: 0,
        }}>
          <div style={{ padding: '0 1rem' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Admin</div>
            {[
              { id: 'courses', label: 'Course Manager', icon: '◎' },
              { id: 'students', label: 'Students', icon: '⊞' },
            ].map(item => (
              <div key={item.id} onClick={() => setActiveTab(item.id as any)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, marginBottom: 2,
                cursor: 'pointer',
                background: activeTab === item.id ? 'rgba(213,156,16,0.08)' : 'transparent',
                border: activeTab === item.id ? '1px solid rgba(213,156,16,0.15)' : '1px solid transparent',
                color: activeTab === item.id ? '#D59C10' : '#6B7280',
                fontSize: 14, fontWeight: activeTab === item.id ? 600 : 400,
              }}>
                <span>{item.icon}</span>{item.label}
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, marginLeft: 220, padding: '2rem 2.5rem', overflowY: 'auto' }}>

          {/* COURSE MANAGER */}
          {activeTab === 'courses' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// course manager'}</div>
                  <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em' }}>Courses</h1>
                </div>
                <button onClick={() => { setEditingCourse(EMPTY_COURSE); setShowForm(true); }} style={{
                  background: '#D59C10', border: 'none', borderRadius: 50,
                  padding: '10px 24px', fontSize: 14, fontWeight: 700,
                  color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}>+ New Course</button>
              </div>

              {/* Course form */}
              {showForm && (
                <div style={{
                  background: '#22262B', border: '1px solid #2A2F35',
                  borderRadius: 20, padding: '1.75rem 2rem', marginBottom: '2rem',
                }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F5F5F5', marginBottom: '1.5rem' }}>
                    {editingCourse.id ? 'Edit Course' : 'New Course'}
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Course Title *</label>
                      <input style={inputStyle} value={editingCourse.title} onChange={e => setEditingCourse(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Intro to Machine Learning" />
                    </div>
                    <div>
                      <label style={labelStyle}>Track</label>
                      <select style={{ ...inputStyle, cursor: 'pointer' }} value={editingCourse.track} onChange={e => setEditingCourse(p => ({ ...p, track: e.target.value }))}>
                        {Object.entries(TRACKS).map(([code, t]) => (
                          <option key={code} value={code}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Level</label>
                      <select style={{ ...inputStyle, cursor: 'pointer' }} value={editingCourse.level} onChange={e => setEditingCourse(p => ({ ...p, level: e.target.value }))}>
                        {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Number of Lessons</label>
                      <input style={inputStyle} type="number" value={editingCourse.lessons_count} onChange={e => setEditingCourse(p => ({ ...p, lessons_count: parseInt(e.target.value) || 0 }))} placeholder="e.g. 5" />
                    </div>
                    <div>
                      <label style={labelStyle}>Duration</label>
                      <input style={inputStyle} value={editingCourse.duration} onChange={e => setEditingCourse(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 4h 30m" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Description *</label>
                      <textarea
                        value={editingCourse.description}
                        onChange={e => setEditingCourse(p => ({ ...p, description: e.target.value }))}
                        placeholder="A short description of what students will learn..."
                        rows={3}
                        style={{
                          ...inputStyle, height: 'auto', padding: '10px 14px',
                          resize: 'vertical' as const, lineHeight: 1.6,
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={saveCourse} disabled={saving} style={{
                      background: '#D59C10', border: 'none', borderRadius: 50,
                      padding: '10px 28px', fontSize: 14, fontWeight: 700,
                      color: '#1A1D21', cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                    }}>{saving ? 'Saving...' : editingCourse.id ? 'Update Course' : 'Create Course'}</button>
                    <button onClick={() => { setShowForm(false); setEditingCourse(EMPTY_COURSE); }} style={{
                      background: 'transparent', border: '1px solid #3A3F46', borderRadius: 50,
                      padding: '10px 28px', fontSize: 14, color: '#6B7280',
                      cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    }}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Course list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {courses.map(course => {
                  const track = TRACKS[course.track as keyof typeof TRACKS];
                  return (
                    <div key={course.id} style={{
                      background: '#22262B', border: '1px solid #2A2F35',
                      borderRadius: 16, padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: `${track?.color}15`,
                        border: `1px solid ${track?.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10, fontWeight: 700, color: track?.color,
                      }}>{course.track}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5', marginBottom: 3 }}>{course.title}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>
                          {track?.label} · {course.level} · {course.lessons_count} lessons · {course.duration}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => { setEditingCourse(course); setShowForm(true); }} style={{
                          background: 'transparent', border: '1px solid #3A3F46',
                          borderRadius: 20, padding: '6px 16px',
                          fontSize: 12, color: '#F5F5F5', cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}>Edit</button>
                        <button onClick={() => deleteCourse(course.id!)} style={{
                          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
                          borderRadius: 20, padding: '6px 16px',
                          fontSize: 12, color: '#F87171', cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}>Delete</button>
                      </div>
                    </div>
                  );
                })}
                {courses.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '4rem 0', color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                    {'// no courses yet. click "New Course" to add one.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STUDENTS */}
          {activeTab === 'students' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// students'}</div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em' }}>
                  Students <span style={{ fontSize: 16, color: '#6B7280', fontWeight: 400 }}>({students.length})</span>
                </h1>
              </div>
              <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2F35' }}>
                      {['Name', 'Email', 'Track', 'Joined'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => {
                      const track = TRACKS[s.track as keyof typeof TRACKS];
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #2A2F35' }}>
                          <td style={{ padding: '13px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%',
                                background: '#D59C10', color: '#1A1D21',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 11, flexShrink: 0,
                              }}>
                                {s.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </div>
                              <span style={{ fontSize: 14, color: '#F5F5F5', fontWeight: 500 }}>{s.full_name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: 13, color: '#6B7280' }}>{s.email}</td>
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 10px',
                              borderRadius: 20, fontFamily: 'JetBrains Mono, monospace',
                              background: `${track?.color}15`, color: track?.color,
                            }}>{s.track}</span>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: 12, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>
                            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: '#22262B', border: '1px solid #D59C10',
          borderRadius: 12, padding: '12px 20px',
          fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#F5F5F5',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}