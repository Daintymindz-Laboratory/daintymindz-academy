'use client';
import Image from 'next/image';
import { useState } from 'react';

const TRACKS = {
  AI: { label: 'Artificial Intelligence', color: '#D59C10', glow: 'rgba(213,156,16,0.15)' },
  DS: { label: 'Data Science & Analytics', color: '#4E8FD4', glow: 'rgba(78,143,212,0.15)' },
  SE: { label: 'Software Engineering', color: '#4CAF7D', glow: 'rgba(76,175,125,0.15)' },
  DO: { label: 'Data Operations', color: '#9B6FD4', glow: 'rgba(155,111,212,0.15)' },
};

const ALL_COURSES = [
  { id: 1, title: 'Intro to Machine Learning', track: 'AI', level: 'Beginner', lessons: 5, duration: '4h 20m', desc: 'Learn the fundamentals of ML, supervised learning, and build your first model with scikit-learn.' },
  { id: 2, title: 'Computer Vision with OpenCV', track: 'AI', level: 'Intermediate', lessons: 6, duration: '5h 30m', desc: 'Image processing, object detection, and building vision pipelines with OpenCV and PyTorch.' },
  { id: 3, title: 'Natural Language Processing', track: 'AI', level: 'Intermediate', lessons: 7, duration: '6h', desc: 'Text classification, sentiment analysis, embeddings, and fine-tuning language models.' },
  { id: 4, title: 'Model Deployment with FastAPI', track: 'AI', level: 'Advanced', lessons: 6, duration: '5h', desc: 'Package and serve ML models as production REST APIs using FastAPI and Docker.' },
  { id: 5, title: 'Python for Data Science', track: 'DS', level: 'Beginner', lessons: 5, duration: '4h', desc: 'Master pandas, NumPy, and Matplotlib for end-to-end exploratory data analysis.' },
  { id: 6, title: 'Statistics & Probability for AI', track: 'DS', level: 'Intermediate', lessons: 6, duration: '5h', desc: 'Distributions, hypothesis testing, Bayesian thinking, and statistical foundations for ML.' },
  { id: 7, title: 'Data Visualization & Dashboards', track: 'DS', level: 'Advanced', lessons: 5, duration: '4h 30m', desc: 'Build executive dashboards and interactive visualizations with Plotly and Streamlit.' },
  { id: 8, title: 'Python Programming Fundamentals', track: 'SE', level: 'Beginner', lessons: 6, duration: '5h', desc: 'Variables, functions, OOP, file handling, and writing clean Pythonic code from scratch.' },
  { id: 9, title: 'REST APIs & System Design', track: 'SE', level: 'Intermediate', lessons: 6, duration: '5h 30m', desc: 'Design and build scalable REST APIs, understand system architecture and trade-offs.' },
  { id: 10, title: 'Git & Developer Workflow', track: 'SE', level: 'Beginner', lessons: 4, duration: '3h', desc: 'Version control, branching strategies, pull requests, and professional Git workflows.' },
  { id: 11, title: 'Data Collection & Web Scraping', track: 'DO', level: 'Beginner', lessons: 5, duration: '4h', desc: 'Collect datasets using BeautifulSoup, Selenium, and public APIs for AI projects.' },
  { id: 12, title: 'Data Annotation & Labeling', track: 'DO', level: 'Intermediate', lessons: 5, duration: '4h 30m', desc: 'Label Studio, annotation best practices, quality control, and building labeled datasets.' },
  { id: 13, title: 'MLOps & Pipeline Engineering', track: 'DO', level: 'Advanced', lessons: 7, duration: '6h 30m', desc: 'ML monitoring, model versioning, DVC, MLflow, and CI/CD for AI systems.' },
];

const levelColors: Record<string, { bg: string; color: string }> = {
  Beginner: { bg: 'rgba(76,175,125,0.12)', color: '#4CAF7D' },
  Intermediate: { bg: 'rgba(78,143,212,0.12)', color: '#4E8FD4' },
  Advanced: { bg: 'rgba(213,156,16,0.12)', color: '#D59C10' },
};

const NAV_ITEMS = [
  { icon: '⊞', label: 'Dashboard', href: '/dashboard' },
  { icon: '◎', label: 'My Courses', href: '/dashboard' },
  { icon: '✦', label: 'Catalog', href: '/catalog', active: true },
  { icon: '◈', label: 'Certificates', href: '/dashboard' },
];

export default function Catalog() {
  const [trackFilter, setTrackFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [enrolled, setEnrolled] = useState<number[]>([1, 5, 11]);

  const filtered = ALL_COURSES.filter(c => {
    const matchTrack = trackFilter === 'All' || c.track === trackFilter;
    const matchLevel = levelFilter === 'All' || c.level === levelFilter;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.desc.toLowerCase().includes(search.toLowerCase());
    return matchTrack && matchLevel && matchSearch;
  });

  const toggleEnroll = (id: number) => {
    setEnrolled(prev => prev.includes(id) ? prev : [...prev, id]);
  };

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
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={100} height={36} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 14, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 8 }}>Academy</span>
        </a>
        <div style={{ flex: 1 }} />
        <div style={{
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
        }}>GN</div>
      </nav>

      <div style={{ display: 'flex', flex: 1, paddingTop: 64 }}>

        {/* SIDEBAR */}
        <aside style={{
          width: 240, background: '#1A1D21',
          borderRight: '1px solid #2A2F35',
          padding: '1.5rem 0',
          position: 'fixed', top: 64, bottom: 0,
          overflowY: 'auto', zIndex: 40,
        }}>
          <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Navigation</div>
            {NAV_ITEMS.map(item => (
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

          {/* Track filter in sidebar */}
          <div style={{ padding: '0 1rem' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Filter by track</div>
            <div
              onClick={() => setTrackFilter('All')}
              style={{
                padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                cursor: 'pointer', fontSize: 14,
                background: trackFilter === 'All' ? 'rgba(213,156,16,0.08)' : 'transparent',
                border: trackFilter === 'All' ? '1px solid rgba(213,156,16,0.15)' : '1px solid transparent',
                color: trackFilter === 'All' ? '#D59C10' : '#6B7280',
              }}
            >
              All tracks
            </div>
            {Object.entries(TRACKS).map(([code, t]) => (
              <div
                key={code}
                onClick={() => setTrackFilter(code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                  cursor: 'pointer',
                  background: trackFilter === code ? `${t.color}10` : 'transparent',
                  border: trackFilter === code ? `1px solid ${t.color}25` : '1px solid transparent',
                  color: trackFilter === code ? t.color : '#6B7280',
                  fontSize: 14, transition: 'all 0.15s',
                }}
              >
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
        <main style={{ flex: 1, marginLeft: 240, padding: '2.5rem', overflowY: 'auto' }}>

          {/* Header */}
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
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                style={{
                  padding: '7px 18px', borderRadius: 50,
                  border: levelFilter === level ? 'none' : '1px solid #2A2F35',
                  background: levelFilter === level ? '#D59C10' : '#22262B',
                  color: levelFilter === level ? '#1A1D21' : '#6B7280',
                  fontSize: 13, fontWeight: levelFilter === level ? 700 : 400,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
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
              {'// no courses match your search'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {filtered.map(course => {
                const track = TRACKS[course.track as keyof typeof TRACKS];
                const level = levelColors[course.level];
                const isEnrolled = enrolled.includes(course.id);
                return (
                  <div
                    key={course.id}
                    style={{
                      background: '#22262B', border: '1px solid #2A2F35',
                      borderRadius: 20, padding: '22px',
                      display: 'flex', flexDirection: 'column', gap: 14,
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
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
                    {/* Track + Level */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: track.glow,
                        border: `1px solid ${track.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 9, fontWeight: 700, color: track.color,
                        flexShrink: 0,
                      }}>{course.track}</div>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        background: level.bg, color: level.color,
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

                    {/* Title + desc */}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F5', marginBottom: 6, lineHeight: 1.35 }}>
                        {course.title}
                      </div>
                      <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65 }}>
                        {course.desc}
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{ display: 'flex', gap: 16 }}>
                      <span style={{ fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>
                        {course.lessons} lessons
                      </span>
                      <span style={{ fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>
                        {course.duration}
                      </span>
                    </div>

                    {/* Enroll button */}
                    <button
                      onClick={() => toggleEnroll(course.id)}
                      style={{
                        padding: '10px 0', borderRadius: 50,
                        background: isEnrolled ? 'rgba(213,156,16,0.08)' : '#D59C10',
                        border: isEnrolled ? '1px solid rgba(213,156,16,0.3)' : 'none',
                        color: isEnrolled ? '#D59C10' : '#1A1D21',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                        transition: 'all 0.2s',
                      }}
                    >
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