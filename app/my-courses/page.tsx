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
};

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/signin'; return; }

      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single();
      if (profile) setUserName(profile.full_name);

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, courses(*)')
        .eq('user_id', user.id);

      const { data: progressData } = await supabase
        .from('progress').select('*').eq('user_id', user.id);

      const progressMap = Object.fromEntries(
        (progressData || []).map((p: any) => [p.course_id, p.percentage])
      );

      if (enrollments) {
        setCourses(enrollments.map((e: any) => ({
          ...e.courses,
          progress: progressMap[e.course_id] || 0,
        })));
      }

      setLoading(false);
    };
    init();
  }, []);

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
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={100} height={36} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 14, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 8 }}>Academy</span>
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

        {/* SIDEBAR */}
        <aside style={{
          width: 240, background: '#1A1D21', borderRight: '1px solid #2A2F35',
          padding: '1.5rem 0', position: 'fixed', top: 64, bottom: 0,
          overflowY: 'auto', zIndex: 40,
        }}>
          <div style={{ padding: '0 1rem' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Navigation</div>
            {[
              { icon: '⊞', label: 'Dashboard', href: '/dashboard' },
              { icon: '◎', label: 'My Courses', href: '/my-courses', active: true },
              { icon: '✦', label: 'Catalog', href: '/catalog' },
              { icon: '◈', label: 'Certificates', href: '/certificates' },
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
        <main style={{ flex: 1, marginLeft: 240, padding: '2.5rem', overflowY: 'auto' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
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

                    <button onClick={() => window.location.href = `/lesson/${course.id}/1`} style={{
                      padding: '10px 0', borderRadius: 50,
                      background: course.progress > 0 ? 'rgba(213,156,16,0.08)' : '#D59C10',
                      border: course.progress > 0 ? '1px solid rgba(213,156,16,0.3)' : 'none',
                      color: course.progress > 0 ? '#D59C10' : '#1A1D21',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                    }}>
                      {course.progress === 100 ? 'Completed' : course.progress > 0 ? 'Continue' : 'Start course'}
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