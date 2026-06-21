'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const TRACKS: Record<string, { label: string; color: string; glow: string }> = {
  AI: { label: 'Artificial Intelligence', color: '#D59C10', glow: 'rgba(213,156,16,0.15)' },
  DS: { label: 'Data Science & Analytics', color: '#4E8FD4', glow: 'rgba(78,143,212,0.15)' },
  SE: { label: 'Software Engineering', color: '#4CAF7D', glow: 'rgba(76,175,125,0.15)' },
  DO: { label: 'Data Operations', color: '#9B6FD4', glow: 'rgba(155,111,212,0.15)' },
};

const levelColors: Record<string, { bg: string; color: string }> = {
  Beginner: { bg: 'rgba(76,175,125,0.12)', color: '#4CAF7D' },
  Intermediate: { bg: 'rgba(78,143,212,0.12)', color: '#4E8FD4' },
  Advanced: { bg: 'rgba(213,156,16,0.12)', color: '#D59C10' },
};

type Course = {
  id: number;
  title: string;
  track: string;
  level: string;
  lessons_count: number;
  duration: string;
  description: string;
  progress: number;
  resumeLessonId: number | null;
};

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unenrolling, setUnenrolling] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user || userError) { window.location.href = '/signin'; return; }

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('full_name, is_admin').eq('id', user.id).single();
      if (profileError) console.error('Profile fetch error:', profileError);
      if (profile) {
        setUserName(profile.full_name);
        setIsAdmin(!!profile.is_admin);
      }

      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('course_id, courses(*)')
        .eq('user_id', user.id);
      if (enrollError) console.error('Enrollments fetch error:', enrollError);

      const { data: progressData, error: progressError } = await supabase
        .from('progress').select('course_id, percentage, completed_lessons').eq('user_id', user.id);
      if (progressError) console.error('Progress fetch error:', progressError);

      const progressMap = Object.fromEntries(
        (progressData || []).map((p: any) => [p.course_id, {
          percentage: p.percentage,
          completedLessons: (p.completed_lessons || []).map(Number),
        }])
      );

      const enrolledCourseIds = (enrollments || []).map((e: any) => e.course_id);

      // Fetch all lesson IDs for enrolled courses to determine resume lesson
      const { data: lessonsData, error: lessonsError } = enrolledCourseIds.length > 0
        ? await supabase.from('lessons').select('id, course_id, order_index')
            .in('course_id', enrolledCourseIds)
            .eq('is_published', true)
            .order('order_index')
        : { data: [], error: null };
      if (lessonsError) console.error('Lessons fetch error:', lessonsError);

      // Build map: course_id -> first incomplete lesson ID (or null if complete)
      const resumeMap: Record<number, number | null> = {};
      for (const courseId of enrolledCourseIds) {
        const prog = progressMap[courseId];
        const completedLessons: number[] = prog?.completedLessons || [];
        const courseLessons = (lessonsData || []).filter((l: any) => l.course_id === courseId);
        const nextLesson = courseLessons.find((l: any) => !completedLessons.includes(l.id));
        resumeMap[courseId] = nextLesson ? nextLesson.id : (courseLessons[0]?.id || null);
      }

      if (enrollments) {
        setCourses(enrollments.map((e: any) => ({
          ...e.courses,
          progress: progressMap[e.course_id]?.percentage || 0,
          resumeLessonId: resumeMap[e.course_id] || null,
        })));
      }

      setLoading(false);
    };
    init();
  }, []);

  const unenroll = async (courseId: number) => {
    setUnenrolling(courseId);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('enrollments').delete().eq('user_id', user.id).eq('course_id', courseId);
    await supabase.from('progress').delete().eq('user_id', user.id).eq('course_id', courseId);
    setCourses(prev => prev.filter(c => c.id !== courseId));
    setUnenrolling(null);
    setConfirmId(null);
  };

  if (loading) return (
    <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D59C10', fontSize: 13 }}>Loading your courses...</div>
    </div>
  );

  return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{
        height: 64, background: '#1A1D21', borderBottom: '1px solid #2A2F35',
        display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 16,
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      }}>
        <button onClick={() => setSidebarOpen(o => !o)} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 20, padding: 4,
        }}>☰</button>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={100} height={36} style={{ objectFit: 'contain' }} />
          <span className="dm-nav-academy" style={{ fontSize: 14, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 8 }}>Academy</span>
        </a>
        <div style={{ flex: 1 }} />
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#D59C10', color: '#1A1D21',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, flexShrink: 0,
        }}>
          {userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, paddingTop: 64 }}>

        {/* Mobile backdrop */}
        <div className={`dm-sidebar-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
        {/* SIDEBAR */}
        <aside className={`dm-sidebar${sidebarOpen ? ' open' : ''}`} style={{ padding: '1.5rem 0' }}>
          <div style={{ padding: '0 1rem' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Navigation</div>
            {[
              { icon: '⊞', label: 'Dashboard', href: '/dashboard' },
              { icon: '◎', label: 'My Courses', href: '/my-courses', active: true },
              { icon: '✦', label: 'Catalog', href: '/catalog' },
              { icon: '◈', label: 'Certificates', href: '/certificates' },
              ...(isAdmin ? [{ icon: '⚙', label: 'Admin Panel', href: '/admin' }] : []),
            ].map(item => (
              <a key={item.label} href={item.href} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                textDecoration: 'none',
                background: item.active ? 'rgba(213,156,16,0.08)' : 'transparent',
                border: item.active ? '1px solid rgba(213,156,16,0.15)' : '1px solid transparent',
                color: item.active ? '#D59C10' : '#6B7280',
                fontSize: 14, fontWeight: item.active ? 600 : 400,
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className="dm-main" style={{ flex: 1, marginLeft: 240, padding: '2.5rem', overflowY: 'auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              {'// my courses'}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em', marginBottom: 4 }}>
              My Courses
            </h1>
            <p style={{ fontSize: 14, color: '#6B7280' }}>
              {courses.length === 0 ? 'You have not enrolled in any courses yet.' : `${courses.length} course${courses.length > 1 ? 's' : ''} enrolled`}
            </p>
          </div>

          {courses.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '5rem 0',
              border: '1px dashed #2A2F35', borderRadius: 20,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F5', marginBottom: 8 }}>No courses yet</div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
                Browse the catalog and enroll in your first course.
              </div>
              <a href="/catalog" style={{
                background: '#D59C10', borderRadius: 50,
                padding: '10px 28px', fontSize: 14, fontWeight: 700,
                color: '#1A1D21', textDecoration: 'none', display: 'inline-block',
              }}>Browse catalog</a>
            </div>
          ) : (
            <div className="dm-grid-3">
              {courses.map(course => {
                const track = TRACKS[course.track];
                const level = levelColors[course.level];
                return (
                  <div key={course.id} style={{
                    background: '#22262B', border: '1px solid #2A2F35',
                    borderRadius: 20, padding: '22px',
                    display: 'flex', flexDirection: 'column', gap: 14,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = track?.color;
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${track?.glow}`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2F35';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: track?.glow,
                        border: `1px solid ${track?.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 9, fontWeight: 700, color: track?.color, flexShrink: 0,
                      }}>{course.track}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        background: level?.bg, color: level?.color,
                        padding: '3px 10px', borderRadius: 20,
                        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
                      }}>{course.level}</span>
                    </div>

                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F5', marginBottom: 6, lineHeight: 1.35 }}>
                        {course.title}
                      </div>
                      <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65 }}>
                        {course.description}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                      <span style={{ fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>
                        {course.lessons_count} lessons
                      </span>
                      <span style={{ fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>
                        {course.duration}
                      </span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>Progress</span>
                        <span style={{ fontSize: 11, color: track?.color, fontFamily: 'JetBrains Mono, monospace' }}>{course.progress}%</span>
                      </div>
                      <div style={{ background: '#2A2F35', borderRadius: 10, height: 4 }}>
                        <div style={{ width: `${course.progress}%`, height: 4, borderRadius: 10, background: track?.color, transition: 'width 0.4s' }} />
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const lessonId = course.resumeLessonId || '1';
                        window.location.href = `/lesson/${course.id}/${lessonId}`;
                      }}
                      style={{
                        padding: '10px 0', borderRadius: 50,
                        background: course.progress > 0 ? 'rgba(213,156,16,0.08)' : '#D59C10',
                        border: course.progress > 0 ? '1px solid rgba(213,156,16,0.3)' : 'none',
                        color: course.progress > 0 ? '#D59C10' : '#1A1D21',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                      }}
                    >
                      {course.progress === 100 ? 'Review course' : course.progress > 0 ? 'Continue' : 'Start course'}
                    </button>

                    {confirmId === course.id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => unenroll(course.id)}
                          disabled={unenrolling === course.id}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 50,
                            background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.4)',
                            color: '#F87171', fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                          }}
                        >
                          {unenrolling === course.id ? 'Removing...' : 'Yes, unenroll'}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 50,
                            background: 'transparent', border: '1px solid #3A3F46',
                            color: '#6B7280', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                          }}
                        >Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmId(course.id)}
                        style={{
                          padding: '8px 0', borderRadius: 50,
                          background: 'transparent', border: '1px solid #2A2F35',
                          color: '#3A3F46', fontSize: 12, fontWeight: 500,
                          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(220,38,38,0.4)';
                          (e.currentTarget as HTMLButtonElement).style.color = '#F87171';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = '#2A2F35';
                          (e.currentTarget as HTMLButtonElement).style.color = '#3A3F46';
                        }}
                      >Unenroll</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}