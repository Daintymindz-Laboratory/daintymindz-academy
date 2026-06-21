'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const TRACKS = {
  AI: { label: 'Artificial Intelligence', color: '#D59C10', glow: 'rgba(213,156,16,0.15)' },
  DS: { label: 'Data Science & Analytics', color: '#4E8FD4', glow: 'rgba(78,143,212,0.15)' },
  SE: { label: 'Software Engineering', color: '#4CAF7D', glow: 'rgba(76,175,125,0.15)' },
  DO: { label: 'Data Operations', color: '#9B6FD4', glow: 'rgba(155,111,212,0.15)' },
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
  enrolled: boolean;
  resumeLessonId: number | null;
};

type UserProfile = { name: string; track: string; streak: number; certsEarned: number; isAdmin: boolean; };

const levelColors: Record<string, { bg: string; color: string }> = {
  Beginner: { bg: 'rgba(76,175,125,0.12)', color: '#4CAF7D' },
  Intermediate: { bg: 'rgba(78,143,212,0.12)', color: '#4E8FD4' },
  Advanced: { bg: 'rgba(213,156,16,0.12)', color: '#D59C10' },
};

function ProgressRing({ progress, size = 48, color = '#D59C10' }: { progress: number; size?: number; color?: string }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A2F35" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

function CourseCard({ course, recommended = false, onEnroll }: { course: Course; recommended?: boolean; onEnroll?: (id: number) => void }) {
  const track = TRACKS[course.track as keyof typeof TRACKS];
  const level = levelColors[course.level];
  const [enrolled, setEnrolled] = useState(course.enrolled);

  return (
    <div style={{
      background: '#22262B', border: '1px solid #2A2F35',
      borderRadius: 20, padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = track.color;
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${track.glow}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#2A2F35';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {recommended && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(213,156,16,0.12)',
          border: '1px solid rgba(213,156,16,0.3)',
          borderRadius: 20, padding: '2px 10px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9, color: '#D59C10', letterSpacing: '0.1em',
        }}>RECOMMENDED</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: track.glow,
          border: `1px solid ${track.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, fontWeight: 700, color: track.color,
          flexShrink: 0,
        }}>{course.track}</div>
        <span style={{
          fontSize: 10, fontWeight: 600,
          background: level.bg, color: level.color,
          padding: '2px 10px', borderRadius: 20,
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: '0.06em',
        }}>{course.level}</span>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5', marginBottom: 4, lineHeight: 1.3 }}>
          {course.title}
        </div>
        <div style={{ fontSize: 12, color: '#6B7280' }}>
          {course.lessons_count} lessons · {track.label}
        </div>
      </div>

      {enrolled && course.progress > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>Progress</span>
            <span style={{ fontSize: 11, color: track.color, fontFamily: 'JetBrains Mono, monospace' }}>{course.progress}%</span>
          </div>
          <div style={{ background: '#2A2F35', borderRadius: 10, height: 4 }}>
            <div style={{ width: `${course.progress}%`, height: 4, borderRadius: 10, background: track.color, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      <button
        onClick={async () => {
          if (enrolled) {
            window.location.href = `/lesson/${course.id}/1`;
          } else {
            const { createClient } = await import('@/lib/supabase');
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from('enrollments').insert({ user_id: user.id, course_id: course.id });
              setEnrolled(true);
              if (onEnroll) onEnroll(course.id);
            }
          }
        }}
        style={{
          marginTop: 4, padding: '9px 0',
          background: enrolled ? 'rgba(213,156,16,0.08)' : '#D59C10',
          border: enrolled ? '1px solid rgba(213,156,16,0.3)' : 'none',
          borderRadius: 50, fontSize: 13, fontWeight: 700,
          color: enrolled ? '#D59C10' : '#1A1D21',
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          transition: 'all 0.2s',
        }}
      >
        {enrolled ? (course.progress > 0 ? 'Continue learning' : 'Start course') : 'Enroll'}
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile>({ name: '', track: 'AI', streak: 0, certsEarned: 0, isAdmin: false });
  const [userLoading, setUserLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dm-sidebar-collapsed') === '1';
    return false;
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);
  const fileInputRef = typeof window !== 'undefined' ? { current: null as HTMLInputElement | null } : { current: null as HTMLInputElement | null };

  const [allCourses, setAllCourses] = useState<Course[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { window.location.href = '/signin'; return; }
      setAuthUserId(authUser.id);
      setAuthEmail(authUser.email || '');

      const [
        { data: profile, error: profileError },
        { data: courses, error: coursesError },
        { data: enrollments, error: enrollError },
        { data: progressData, error: progressError },
        { data: certsData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', authUser.id).single(),
        supabase.from('courses').select('*').order('id'),
        supabase.from('enrollments').select('course_id').eq('user_id', authUser.id),
        supabase.from('progress').select('course_id, percentage, completed_lessons').eq('user_id', authUser.id),
        supabase.from('certificates').select('id').eq('user_id', authUser.id),
      ]);

      if (profileError) console.error('Profile fetch error:', profileError);
      if (coursesError) console.error('Courses fetch error:', coursesError);
      if (enrollError) console.error('Enrollments fetch error:', enrollError);
      if (progressError) console.error('Progress fetch error:', progressError);

      const certsCount = certsData?.length || 0;

      if (profile) {
        setUser({
          name: profile.full_name || authUser.email || 'Student',
          track: profile.track || 'AI',
          streak: 0,
          certsEarned: certsCount,
          isAdmin: !!profile.is_admin,
        });
        setProfileBio(profile.bio || '');
        setProfileAvatarUrl(profile.avatar_url || '');
      }

      const enrolledIds = enrollments?.map((e: any) => e.course_id) || [];
      const progressMap = Object.fromEntries((progressData || []).map((p: any) => [p.course_id, p.percentage]));

      // Fetch lesson IDs for enrolled courses to compute resume lesson
      let resumeLessonIdMap: Record<number, number | null> = {};
      if (enrolledIds.length > 0) {
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons').select('id, course_id, order_index')
          .in('course_id', enrolledIds).eq('is_published', true).order('order_index');
        if (lessonsError) console.error('Lessons fetch error:', lessonsError);
        for (const courseId of enrolledIds) {
          const prog = (progressData || []).find((p: any) => p.course_id === courseId);
          const completedLessons: number[] = (prog?.completed_lessons || []).map(Number);
          const courseLessons = (lessonsData || []).filter((l: any) => Number(l.course_id) === Number(courseId));
          const nextLesson = courseLessons.find((l: any) => !completedLessons.includes(Number(l.id)));
          resumeLessonIdMap[Number(courseId)] = nextLesson
            ? Number(nextLesson.id)
            : courseLessons[0] ? Number(courseLessons[0].id) : null;
        }
      }

      if (courses) {
        setAllCourses(courses.map((c: any) => ({
          ...c,
          lessons: c.lessons_count,
          enrolled: enrolledIds.includes(c.id),
          progress: progressMap[c.id] || 0,
          resumeLessonId: resumeLessonIdMap[Number(c.id)] ?? null,
        })));
      }

      setUserLoading(false);
    };
    loadUser();
  }, []);


  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState('All');

  const toggleCollapse = () => {
    setSidebarCollapsed(c => {
      const next = !c;
      localStorage.setItem('dm-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  };
  const userTrack = user.track as keyof typeof TRACKS;
  const recommended = allCourses.filter(c => c.track === userTrack && !c.enrolled);
  const explore = allCourses.filter(c => c.track !== userTrack && !c.enrolled && (activeTrack === 'All' || c.track === activeTrack));
  const completedCount = allCourses.filter(c => c.progress === 100).length;
  
  if (userLoading) return (
    <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D59C10', fontSize: 13, letterSpacing: '0.1em' }}>
        Loading...
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
        <button onClick={() => { if (window.innerWidth < 769) setSidebarOpen(o => !o); else toggleCollapse(); }} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#6B7280', fontSize: 20, padding: 4,
        }}>☰</button>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={100} height={36} style={{ objectFit: 'contain' }} />
          <span className="dm-nav-academy" style={{ fontSize: 14, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 8 }}>Academy</span>
        </a>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div className="dm-hide-mobile" style={{
          background: '#22262B', border: '1px solid #2A2F35',
          borderRadius: 50, padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
          width: 240,
        }}>
          <span style={{ color: '#3A3F46', fontSize: 14 }}>⌕</span>
          <input placeholder="Search courses..." style={{
            background: 'none', border: 'none', outline: 'none',
            color: '#F5F5F5', fontSize: 13, width: '100%',
            fontFamily: 'DM Sans, sans-serif',
          }} />
        </div>

        {/* Streak */}
        <div className="dm-hide-mobile" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(213,156,16,0.08)',
          border: '1px solid rgba(213,156,16,0.2)',
          borderRadius: 50, padding: '6px 14px',
        }}>
          <span style={{ fontSize: 14 }}>🔥</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#D59C10' }}>{user.streak} day streak</span>
        </div>

        {/* Avatar */}
        <div onClick={() => setProfileOpen(true)} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: profileAvatarUrl ? 'transparent' : '#D59C10', color: '#1A1D21',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0,
          overflow: 'hidden', border: '2px solid #D59C10',
        }}>
          {profileAvatarUrl
            ? <img src={profileAvatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user.name.split(' ').map(n => n[0]).join('')}
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, paddingTop: 64 }}>

        {/* SIDEBAR */}
        {/* Mobile backdrop */}
        <div
          className={`dm-sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <aside className={`dm-sidebar${sidebarOpen ? ' open' : ''}${sidebarCollapsed ? ' dm-collapsed' : ''}`} style={{ padding: '1.5rem 0' }}>
            <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                Navigation
              </div>
              {[
                { icon: '⊞', label: 'Dashboard', active: true, href: '/dashboard' },
                { icon: '◎', label: 'My Courses', active: false, href: '/my-courses' },
                { icon: '✦', label: 'Catalog', active: false, href: '/catalog' },
                { icon: '◈', label: 'Certificates', active: false, href: '/certificates' },
                ...(user.isAdmin ? [{ icon: '⚙', label: 'Admin Panel', active: false, href: '/admin' }] : []),
              ].map(item => (
                <a key={item.label} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10,
                  marginBottom: 2, textDecoration: 'none',
                  background: item.active ? 'rgba(213,156,16,0.08)' : 'transparent',
                  border: item.active ? '1px solid rgba(213,156,16,0.15)' : '1px solid transparent',
                  color: item.active ? '#D59C10' : '#6B7280',
                  fontSize: 14, fontWeight: item.active ? 600 : 400,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>

            <div style={{ height: 1, background: '#2A2F35', margin: '0 1rem 1.5rem' }} />

            <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
                Tracks
              </div>
              {Object.entries(TRACKS).map(([code, t]) => (
                <div
                  key={code}
                  onClick={() => setActiveTrack(code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 10,
                    marginBottom: 2, cursor: 'pointer',
                    background: activeTrack === code ? `${t.color}10` : 'transparent',
                    border: activeTrack === code ? `1px solid ${t.color}25` : '1px solid transparent',
                    color: activeTrack === code ? t.color : '#6B7280',
                    fontSize: 14, transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: `${t.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 8, fontWeight: 700, color: t.color,
                    flexShrink: 0,
                  }}>{code}</div>
                  {t.label}
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: '#2A2F35', margin: '0 1rem 1.5rem' }} />

            {/* Profile mini card */}
            <div style={{ padding: '0 1rem' }}>
              <div style={{
                background: '#22262B', border: '1px solid #2A2F35',
                borderRadius: 16, padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: '#D59C10', color: '#1A1D21',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 11, flexShrink: 0,
                  }}>
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5' }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: TRACKS[userTrack].color, fontFamily: 'JetBrains Mono, monospace' }}>{userTrack} track</div>
                  </div>
                </div>
                <button onClick={async () => {
                  const { createClient } = await import('@/lib/supabase');
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }} style={{
                  display: 'block', width: '100%', textAlign: 'center',
                  padding: '7px 0', borderRadius: 50,
                  border: '1px solid #3A3F46', color: '#6B7280',
                  fontSize: 12, background: 'none', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}>Sign out</button>
              </div>
            </div>
          </aside>

        {/* MAIN */}
        <main className={`dm-main${sidebarCollapsed ? ' dm-collapsed' : ''}`} style={{
          flex: 1,
          marginLeft: 240,
          padding: '2.5rem',
          overflowY: 'auto',
        }}>
          {/* Welcome */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, color: '#D59C10',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 8,
            }}>{'// dashboard'}</div>
            <h1 style={{
              fontSize: 28, fontWeight: 700, color: '#F5F5F5',
              letterSpacing: '-0.02em', marginBottom: 6,
            }}>
              Welcome back, {user.name.split(' ')[0]} 👋
            </h1>
            <p style={{ fontSize: 14, color: '#6B7280' }}>
              You are on the {TRACKS[userTrack].label} track. Keep going.
            </p>
          </div>

          {/* Stats row */}
          <div className="dm-grid-4" style={{ marginBottom: '2.5rem' }}>
            {[
              { label: 'Enrolled', val: allCourses.filter(c => c.enrolled).length, unit: 'courses', color: '#D59C10' },
              { label: 'Completed', val: completedCount, unit: 'courses', color: '#4CAF7D' },
              { label: 'Certificates', val: user.certsEarned, unit: 'earned', color: '#4E8FD4' },
              { label: 'Streak', val: user.streak, unit: 'days', color: '#9B6FD4' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#22262B', border: '1px solid #2A2F35',
                borderRadius: 16, padding: '18px 20px',
              }}>
                <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.val}</span>
                  <span style={{ fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Continue learning */}
          {allCourses.filter(c => c.enrolled).length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F5F5F5' }}>My Courses</h2>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3A3F46', letterSpacing: '0.1em' }}>{allCourses.filter(c => c.enrolled).length} ENROLLED</span>
              </div>
              <div className="dm-grid-3">
                {allCourses.filter(c => c.enrolled).map(c => (
                  <div key={c.id} style={{
                    background: '#22262B', border: '1px solid #2A2F35',
                    borderRadius: 20, padding: '20px 22px',
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <ProgressRing progress={c.progress} color={TRACKS[c.track as keyof typeof TRACKS].color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F5', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>{c.progress}% complete</div>
                      <button
                        onClick={() => {
                          const lessonId = c.resumeLessonId || '1';
                          window.location.href = `/lesson/${c.id}/${lessonId}`;
                        }}
                        style={{
                          background: '#D59C10', border: 'none',
                          borderRadius: 50, padding: '6px 16px',
                          fontSize: 12, fontWeight: 700, color: '#1A1D21',
                          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                        }}
                      >Resume</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F5F5F5' }}>Recommended for you</h2>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: TRACKS[userTrack].color, letterSpacing: '0.1em' }}>{userTrack} TRACK</span>
            </div>
            <div className="dm-grid-3">
              {recommended.map(c => <CourseCard key={c.id} course={c} recommended />)}
            </div>
          </div>

          {/* Explore */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F5F5F5' }}>Explore other tracks</h2>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3A3F46', letterSpacing: '0.1em' }}>9 COURSES</span>
            </div>
            <div className="dm-grid-3">
              {explore.map(c => <CourseCard key={c.id} course={c} />)}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}