'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const TRACKS = {
  AI: { label: 'Artificial Intelligence', color: '#D59C10', glow: 'rgba(213,156,16,0.15)' },
  DA: { label: 'Data Analytics', color: '#4E8FD4', glow: 'rgba(78,143,212,0.15)' },
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
};

const BASE_NAV_ITEMS = [
  { icon: '⊞', label: 'Dashboard', href: '/dashboard' },
  { icon: '◎', label: 'My Courses', href: '/my-courses' },
  { icon: '✦', label: 'Catalog', href: '/catalog', active: true },
  { icon: '◈', label: 'Certificates', active: false, href: '/certificates' },
];

export default function Catalog() {
  const [trackFilter, setTrackFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolled, setEnrolled] = useState<number[]>([]);
  const [resumeMap, setResumeMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/signin'; return; }

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('full_name, is_admin').eq('id', user.id).single();
      if (profileError) console.error('Profile fetch error:', profileError);
      if (profile) {
        setUserName(profile.full_name);
        setIsAdmin(!!profile.is_admin);
      }
      setUserId(user.id);

      const { data: coursesData, error: coursesError } = await supabase
        .from('courses').select('*').order('track').order('id');
      if (coursesError) console.error('Courses fetch error:', coursesError);
      if (coursesData) setCourses(coursesData);

      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments').select('course_id').eq('user_id', user.id);
      if (enrollError) console.error('Enrollments fetch error:', enrollError);
      const enrolledIds = (enrollments || []).map((e: any) => e.course_id);
      if (enrollments) setEnrolled(enrolledIds);

      // Build resume map for enrolled courses
      if (enrolledIds.length > 0) {
        const { data: progressData } = await supabase
          .from('progress').select('course_id, completed_lessons').eq('user_id', user.id);
        const { data: lessonsData } = await supabase.from('lessons').select('id, course_id, order_index')
          .in('course_id', enrolledIds).eq('is_published', true).order('order_index');
        const newResumeMap: Record<number, number> = {};
        for (const courseId of enrolledIds) {
          const prog = (progressData || []).find((p: any) => p.course_id === courseId);
          const completedLessons: number[] = (prog?.completed_lessons || []).map(Number);
          const courseLessons = (lessonsData || []).filter((l: any) => l.course_id === courseId);
          const nextLesson = courseLessons.find((l: any) => !completedLessons.includes(l.id));
          if (nextLesson) newResumeMap[courseId] = nextLesson.id;
          else if (courseLessons[0]) newResumeMap[courseId] = courseLessons[0].id;
        }
        setResumeMap(newResumeMap);
      }

      setLoading(false);
    };
    init();
  }, []);

  const enrollInCourse = async (courseId: number) => {
    if (enrolled.includes(courseId)) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('enrollments').insert({ user_id: userId, course_id: courseId });
    setEnrolled(prev => [...prev, courseId]);
  };

  const filtered = courses.filter(c => {
    const matchTrack = trackFilter === 'All' || c.track === trackFilter;
    const matchLevel = levelFilter === 'All' || c.level === levelFilter;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase());
    return matchTrack && matchLevel && matchSearch;
  });

  if (loading) return (
    <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D59C10', fontSize: 13, letterSpacing: '0.1em' }}>
        Loading courses...
      </div>
    </div>
  );

  return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* TOP NAV */}
      <nav style={{
        height: 64, background: '#1A1D21',
        borderBottom: '1px solid #2A2F35',
        display: 'flex', alignItems: 'center',
        padding: '0 1.5rem', gap: 16,
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
        <div className="dm-hide-mobile" style={{
          background: '#22262B', border: '1px solid #2A2F35',
          borderRadius: 50, padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 8, width: 240,
        }}>
          <span style={{ color: '#3A3F46', fontSize: 14 }}>⌕</span>
          <input
            placeholder="Search courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: '#F5F5F5', fontSize: 13, width: '100%',
              fontFamily: 'DM Sans, sans-serif',
            }}
          />
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#D59C10', color: '#1A1D21',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
        }}>
          {userName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, paddingTop: 64 }}>

        {/* Mobile backdrop */}
        <div className={`dm-sidebar-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
        {/* SIDEBAR */}
        <aside className={`dm-sidebar${sidebarOpen ? ' open' : ''}`} style={{ padding: '1.5rem 0' }}>
          <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Navigation</div>
            {[...BASE_NAV_ITEMS, ...(isAdmin ? [{ icon: '⚙', label: 'Admin Panel', href: '/admin', active: false }] : [])].map(item => (
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

          <div style={{ height: 1, background: '#2A2F35', margin: '0 1rem 1.5rem' }} />

          <div style={{ padding: '0 1rem' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Filter by track</div>
            <div onClick={() => setTrackFilter('All')} style={{
              padding: '9px 12px', borderRadius: 10, marginBottom: 2,
              cursor: 'pointer', fontSize: 14,
              background: trackFilter === 'All' ? 'rgba(213,156,16,0.08)' : 'transparent',
              border: trackFilter === 'All' ? '1px solid rgba(213,156,16,0.15)' : '1px solid transparent',
              color: trackFilter === 'All' ? '#D59C10' : '#6B7280',
            }}>All tracks</div>
            {Object.entries(TRACKS).map(([code, t]) => (
              <div key={code} onClick={() => setTrackFilter(code)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                cursor: 'pointer',
                background: trackFilter === code ? `${t.color}10` : 'transparent',
                border: trackFilter === code ? `1px solid ${t.color}25` : '1px solid transparent',
                color: trackFilter === code ? t.color : '#6B7280',
                fontSize: 14, transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: `${t.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 8, fontWeight: 700, color: t.color, flexShrink: 0,
                }}>{code}</div>
                {t.label}
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className="dm-main" style={{ flex: 1, marginLeft: 240, padding: '2.5rem', overflowY: 'auto' }}>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
              {'// course catalog'}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em', marginBottom: 4 }}>
                  All Courses
                </h1>
                <p style={{ fontSize: 14, color: '#6B7280' }}>
                  {filtered.length} {filtered.length === 1 ? 'course' : 'courses'} {trackFilter !== 'All' ? `in ${TRACKS[trackFilter as keyof typeof TRACKS]?.label}` : 'across all tracks'}
                </p>
              </div>
            </div>
          </div>

          {/* Level filter pills */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '2rem', flexWrap: 'wrap' }}>
            {['All', 'Beginner', 'Intermediate', 'Advanced'].map(level => (
              <button key={level} onClick={() => setLevelFilter(level)} style={{
                padding: '7px 18px', borderRadius: 50,
                border: levelFilter === level ? 'none' : '1px solid #2A2F35',
                background: levelFilter === level ? '#D59C10' : '#22262B',
                color: levelFilter === level ? '#1A1D21' : '#6B7280',
                fontSize: 13, fontWeight: levelFilter === level ? 700 : 400,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.15s',
              }}>
                {level}
              </button>
            ))}
          </div>

          {/* Course grid */}
          {filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '5rem 0',
              color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace',
              fontSize: 13, letterSpacing: '0.1em',
            }}>
              {courses.length === 0
                ? '// no courses published yet. check back soon.'
                : '// no courses match your search'}
            </div>
          ) : (
            <div className="dm-grid-3">
              {filtered.map(course => {
                const track = TRACKS[course.track as keyof typeof TRACKS];
                const level = levelColors[course.level];
                const isEnrolled = enrolled.includes(course.id);
                return (
                  <div key={course.id} style={{
                    background: '#22262B', border: '1px solid #2A2F35',
                    borderRadius: 20, padding: '22px',
                    display: 'flex', flexDirection: 'column', gap: 14,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
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
                        fontSize: 9, fontWeight: 700, color: track?.color,
                        flexShrink: 0,
                      }}>{course.track}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        background: level?.bg, color: level?.color,
                        padding: '3px 10px', borderRadius: 20,
                        fontFamily: 'JetBrains Mono, monospace',
                        letterSpacing: '0.06em',
                      }}>{course.level}</span>
                      {isEnrolled && (
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          background: 'rgba(213,156,16,0.1)', color: '#D59C10',
                          padding: '3px 10px', borderRadius: 20,
                          fontFamily: 'JetBrains Mono, monospace',
                          letterSpacing: '0.06em', marginLeft: 'auto',
                        }}>ENROLLED</span>
                      )}
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

                    <button onClick={() => {
                      if (isEnrolled) {
                        const lessonId = resumeMap[course.id] || '1';
                        window.location.href = `/lesson/${course.id}/${lessonId}`;
                      } else {
                        enrollInCourse(course.id);
                      }
                    }} style={{
                      padding: '10px 0', borderRadius: 50,
                      background: isEnrolled ? 'rgba(213,156,16,0.08)' : '#D59C10',
                      border: isEnrolled ? '1px solid rgba(213,156,16,0.3)' : 'none',
                      color: isEnrolled ? '#D59C10' : '#1A1D21',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                    }}>
                      {isEnrolled ? 'Go to course' : 'Enroll'}
                    </button>
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