'use client';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type Lesson = {
  id: number;
  title: string;
  type: string;
  content: string;
  code: string;
  code_label: string;
  language: string;
  starter_code: string;
  instructions: string;
  video_url: string;
  order_index: number;
  is_published: boolean;
};

type Course = {
  id: number;
  title: string;
  track: string;
  level: string;
};

const TRACKS: Record<string, { color: string }> = {
  AI: { color: '#D59C10' },
  DS: { color: '#4E8FD4' },
  SE: { color: '#4CAF7D' },
  DO: { color: '#9B6FD4' },
};

function getVideoEmbed(url: string): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const loomMatch = url.match(/loom\.com\/share\/([^?]+)/);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
  return null;
}

export default function LessonPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'instructions' | 'output'>('instructions');
  const workerRef = useRef<Worker | null>(null);
  const runTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/signin'; return; }

      const { data: profile } = await supabase
        .from('profiles').select('full_name').eq('id', user.id).single();
      if (profile) setUserName(profile.full_name);
      setUserId(user.id);

      const { data: courseData, error: courseError } = await supabase
        .from('courses').select('*').eq('id', courseId).single();
      if (courseError) { console.error('Course fetch error:', courseError); window.location.href = '/dashboard'; return; }
      if (courseData) setCourse(courseData);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons').select('*')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('order_index');
      if (lessonsError) console.error('Lessons fetch error:', lessonsError);
      if (!lessonsData || lessonsData.length === 0) {
        setLoading(false);
        return;
      }
      setLessons(lessonsData);
      const target = lessonId === '1'
        ? lessonsData[0]
        : (lessonsData.find((l: Lesson) => l.id === parseInt(lessonId)) || lessonsData[0]);
      if (target) {
        setCurrentLesson(target);
        setCode(target.starter_code || target.code || '');
      }

      const { data: progressData, error: progressError } = await supabase
        .from('progress').select('completed_lessons')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
      if (progressError) console.error('Progress fetch error:', progressError);
      if (progressData?.completed_lessons) {
        setCompletedIds((progressData.completed_lessons as any[]).map(Number));
      }

      setLoading(false);
    };
    init();
  }, [courseId, lessonId]);

  // Load Pyodide Web Worker for Python project lessons
  useEffect(() => {
    if (currentLesson?.type !== 'project') return;
    if (currentLesson?.language !== 'python') return;
    if (workerRef.current) return;

    const worker = new Worker('/pyodide-worker.js');
    workerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.type === 'ready') setPyodideReady(true);
    };
    worker.onerror = (err) => {
      console.error('Pyodide worker error:', err);
      setPyodideReady(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [currentLesson]);

  const switchLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setCode(lesson.starter_code || lesson.code || '');
    setOutput('');
    setActiveTab('instructions');
    window.history.pushState({}, '', `/lesson/${courseId}/${lesson.id}`);
  };

  const markComplete = async () => {
    if (!currentLesson || !userId) return;
    const lessonIdNum = Number(currentLesson.id);
    const safeCompletedIds = completedIds.map(Number);
    const newCompleted = safeCompletedIds.includes(lessonIdNum)
      ? safeCompletedIds
      : [...safeCompletedIds, lessonIdNum];
    setCompletedIds(newCompleted);

    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const percentage = Math.round((newCompleted.length / lessons.length) * 100);

    const { data: existing, error: existingError } = await supabase
      .from('progress').select('id')
      .eq('user_id', userId).eq('course_id', courseId).maybeSingle();
    if (existingError) console.error('Progress check error:', existingError);

    if (existing) {
      const { error: updateError } = await supabase.from('progress').update({
        completed_lessons: newCompleted,
        percentage,
        lesson_index: currentLesson.order_index,
        last_accessed: new Date().toISOString(),
      }).eq('user_id', userId).eq('course_id', courseId);
      if (updateError) console.error('Progress update error:', updateError);
    } else {
      const { error: insertError } = await supabase.from('progress').insert({
        user_id: userId,
        course_id: parseInt(courseId),
        completed_lessons: newCompleted,
        percentage,
        lesson_index: currentLesson.order_index,
      });
      if (insertError) console.error('Progress insert error:', insertError);
    }

    // If course complete, generate certificate
    if (newCompleted.length === lessons.length) {
      const certId = `CERT-DM-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const { error: certError } = await supabase.from('certificates').insert({
        user_id: userId,
        course_id: parseInt(courseId),
        cert_id: certId,
      });
      if (certError) console.error('Certificate insert error:', certError);
      window.location.href = `/certificates`;
    } else {
      if (nextLesson) switchLesson(nextLesson);
    }
  };

  const runCode = () => {
    if (!workerRef.current || !pyodideReady) return;
    setRunning(true);
    setActiveTab('output');
    setOutput('Running...\n');

    // Kill previous timeout if any
    if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current);

    const worker = workerRef.current;

    // Timeout: terminate worker and show error after 10 seconds
    runTimeoutRef.current = setTimeout(() => {
      worker.terminate();
      workerRef.current = null;
      setPyodideReady(false);
      setOutput('Error:\nExecution timed out after 10 seconds. Check for infinite loops.');
      setRunning(false);
    }, 10000);

    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'output') {
        clearTimeout(runTimeoutRef.current!);
        setOutput(e.data.output);
        setRunning(false);
        worker.removeEventListener('message', handleMessage);
      } else if (e.data.type === 'error') {
        clearTimeout(runTimeoutRef.current!);
        setOutput(`Error:\n${e.data.error}`);
        setRunning(false);
        worker.removeEventListener('message', handleMessage);
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({ type: 'run', code });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentLesson?.code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trackColor = course ? (TRACKS[course.track]?.color || '#D59C10') : '#D59C10';
  const currentIdx = lessons.findIndex(l => l.id === currentLesson?.id);
  const prevLesson = currentIdx > 0 ? lessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < lessons.length - 1 ? lessons[currentIdx + 1] : null;
  const isCompleted = currentLesson ? completedIds.map(Number).includes(Number(currentLesson.id)) : false;
  const isLastLesson = currentIdx === lessons.length - 1;

  if (loading) return (
    <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D59C10', fontSize: 13 }}>Loading lesson...</div>
    </div>
  );

  if (!currentLesson) return (
    <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6B7280', fontSize: 13, marginBottom: 16 }}>
          No published lessons yet.
        </div>
        <a href="/my-courses" style={{ color: '#D59C10', textDecoration: 'none', fontSize: 14 }}>Back to my courses</a>
      </div>
    </div>
  );

  const embedUrl = getVideoEmbed(currentLesson.video_url || '');

  return (
    <div style={{ background: '#1A1D21', height: '100vh', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* TOP NAV */}
      <nav style={{
        height: 56, background: '#1A1D21', borderBottom: '1px solid #2A2F35',
        display: 'flex', alignItems: 'center', padding: '0 1.25rem', gap: 12,
        flexShrink: 0, zIndex: 50,
      }}>
        <button onClick={() => setSidebarOpen(o => !o)} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 18, padding: 4,
        }}>☰</button>
        <a href="/my-courses" style={{ textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={88} height={32} style={{ objectFit: 'contain' }} />
        </a>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 13, color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course?.title}</span>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 13, color: '#F5F5F5', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentLesson.title}</span>
        <div style={{ flex: 1 }} />
        <div className="dm-hide-mobile" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B7280' }}>
          {completedIds.length}/{lessons.length} complete
        </div>
        <div className="dm-hide-mobile" style={{ width: 100, height: 4, background: '#2A2F35', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{
            width: `${(completedIds.length / lessons.length) * 100}%`,
            height: '100%', background: trackColor, borderRadius: 10, transition: 'width 0.4s',
          }} />
        </div>
        <a href="/dashboard" style={{
          color: '#6B7280', fontSize: 13, textDecoration: 'none',
          border: '1px solid #2A2F35', borderRadius: 20, padding: '5px 14px',
        }}>Dashboard</a>
      </nav>

      {/* BODY */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Mobile backdrop */}
        <div className={`dm-sidebar-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
        {/* LESSON SIDEBAR */}
        <aside className={`dm-sidebar${sidebarOpen ? ' open' : ''}`} style={{
          width: 260, top: 56, display: 'flex', flexDirection: 'column',
        }}>
            <div style={{ padding: '1.25rem 1rem 0.75rem', borderBottom: '1px solid #2A2F35' }}>
              <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Course content</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5', lineHeight: 1.3 }}>{course?.title}</div>
            </div>
            <div style={{ padding: '0.75rem 0' }}>
              {lessons.map((lesson, idx) => {
                const isDone = completedIds.map(Number).includes(Number(lesson.id));
                const isCurrent = lesson.id === currentLesson.id;
                return (
                  <div key={lesson.id} onClick={() => switchLesson(lesson)} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 16px', cursor: 'pointer',
                    background: isCurrent ? `${trackColor}10` : 'transparent',
                    borderLeft: isCurrent ? `3px solid ${trackColor}` : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: isDone ? 'rgba(76,175,125,0.15)' : isCurrent ? `${trackColor}20` : '#22262B',
                      border: isDone ? '1px solid rgba(76,175,125,0.4)' : isCurrent ? `1px solid ${trackColor}50` : '1px solid #3A3F46',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                      color: isDone ? '#4CAF7D' : isCurrent ? trackColor : '#3A3F46',
                    }}>
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: isCurrent ? 600 : 400,
                        color: isCurrent ? '#F5F5F5' : isDone ? '#6B7280' : '#9CA3AF',
                        lineHeight: 1.35, marginBottom: 3,
                      }}>{lesson.title}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 10,
                          fontFamily: 'JetBrains Mono, monospace',
                          background: lesson.type === 'project' ? 'rgba(155,111,212,0.1)' : 'rgba(213,156,16,0.08)',
                          color: lesson.type === 'project' ? '#9B6FD4' : '#D59C10',
                        }}>{lesson.type.toUpperCase()}</span>
                        {lesson.video_url && (
                          <span style={{
                            fontSize: 9, padding: '1px 6px', borderRadius: 10,
                            fontFamily: 'JetBrains Mono, monospace',
                            background: 'rgba(78,143,212,0.1)', color: '#4E8FD4',
                          }}>VIDEO</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

        {/* SPLIT SCREEN */}
        <div className="lesson-split">

          {/* LEFT: Content */}
          <div style={{ borderRight: '1px solid #2A2F35', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Project tabs */}
            {currentLesson.type === 'project' && (
              <div style={{ display: 'flex', borderBottom: '1px solid #2A2F35', flexShrink: 0 }}>
                {(['instructions', 'output'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '12px 20px', background: 'none', border: 'none',
                    borderBottom: activeTab === tab ? `2px solid ${trackColor}` : '2px solid transparent',
                    color: activeTab === tab ? '#F5F5F5' : '#6B7280',
                    fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    textTransform: 'capitalize',
                  }}>
                    {tab}
                    {tab === 'output' && output && (
                      <span style={{ marginLeft: 6, width: 6, height: 6, borderRadius: '50%', background: trackColor, display: 'inline-block', verticalAlign: 'middle' }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>

              {/* Project output tab */}
              {currentLesson.type === 'project' && activeTab === 'output' ? (
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3A3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Output</div>
                  {output ? (
                    <pre style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                      color: output.startsWith('Error') ? '#F87171' : '#4CAF7D',
                      lineHeight: 1.75, background: '#22262B',
                      border: '1px solid #2A2F35', borderRadius: 14,
                      padding: '16px 18px', margin: 0,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>{output}</pre>
                  ) : (
                    <div style={{ color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                      {'// run your code to see output here'}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Lesson header */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: trackColor,
                      letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10,
                    }}>
                      {currentLesson.type === 'project' ? 'Project' : `Lesson ${currentIdx + 1} of ${lessons.length}`}
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F5', lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.02em' }}>
                      {currentLesson.title}
                    </h1>
                  </div>

                  {/* Video embed */}
                  {embedUrl && (
                    <div style={{ marginBottom: '1.5rem', borderRadius: 12, overflow: 'hidden', border: '1px solid #2A2F35' }}>
                      <iframe
                        src={embedUrl}
                        width="100%"
                        height="315"
                        style={{ display: 'block', border: 'none' }}
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  )}

                  {/* Markdown content */}
                  {currentLesson.type !== 'project' && currentLesson.content && (
                    <div style={{
                      fontSize: 15, lineHeight: 1.8, color: '#9CA3AF',
                    }}>
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F5', margin: '1.5rem 0 0.75rem', letterSpacing: '-0.02em' }}>{children}</h1>,
                          h2: ({ children }) => <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5', margin: '1.5rem 0 0.75rem' }}>{children}</h2>,
                          h3: ({ children }) => <h3 style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F5', margin: '1.25rem 0 0.5rem' }}>{children}</h3>,
                          p: ({ children }) => <p style={{ marginBottom: '1rem', color: '#9CA3AF', lineHeight: 1.8 }}>{children}</p>,
                          strong: ({ children }) => <strong style={{ color: '#F5F5F5', fontWeight: 600 }}>{children}</strong>,
                          em: ({ children }) => <em style={{ color: '#D59C10' }}>{children}</em>,
                          ul: ({ children }) => <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>{children}</ul>,
                          ol: ({ children }) => <ol style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>{children}</ol>,
                          li: ({ children }) => <li style={{ marginBottom: '0.4rem', color: '#9CA3AF' }}>{children}</li>,
                          blockquote: ({ children }) => (
                            <blockquote style={{
                              borderLeft: `3px solid ${trackColor}`,
                              paddingLeft: '1rem', margin: '1rem 0',
                              background: `${trackColor}08`, borderRadius: '0 8px 8px 0',
                              padding: '12px 16px',
                            }}>{children}</blockquote>
                          ),
                          code: ({ children, className }) => {
                            const isBlock = className?.includes('language-');
                            return isBlock ? (
                              <pre style={{
                                background: '#0D1117', borderRadius: 10, padding: '1rem 1.25rem',
                                overflow: 'auto', margin: '1rem 0', border: '1px solid #2A2F35',
                              }}>
                                <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#E5E7EB', lineHeight: 1.7 }}>{children}</code>
                              </pre>
                            ) : (
                              <code style={{
                                background: '#22262B', border: '1px solid #3A3F46',
                                borderRadius: 4, padding: '2px 6px',
                                fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                                color: trackColor,
                              }}>{children}</code>
                            );
                          },
                        }}
                      >
                        {currentLesson.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Project instructions */}
                  {currentLesson.type === 'project' && currentLesson.instructions && (
                    <div style={{ fontSize: 15, lineHeight: 1.8, color: '#9CA3AF' }}>
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F5F5F5', margin: '1.25rem 0 0.75rem' }}>{children}</h1>,
                          h2: ({ children }) => <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F5F5F5', margin: '1.25rem 0 0.75rem' }}>{children}</h2>,
                          p: ({ children }) => <p style={{ marginBottom: '1rem', color: '#9CA3AF' }}>{children}</p>,
                          strong: ({ children }) => <strong style={{ color: '#F5F5F5' }}>{children}</strong>,
                          ul: ({ children }) => <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>{children}</ul>,
                          li: ({ children }) => <li style={{ marginBottom: '0.4rem', color: '#9CA3AF' }}>{children}</li>,
                        }}
                      >
                        {currentLesson.instructions}
                      </ReactMarkdown>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom nav */}
            <div style={{
              padding: '1rem 1.5rem', borderTop: '1px solid #2A2F35',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0, gap: 10,
            }}>
              <button onClick={() => prevLesson && switchLesson(prevLesson)} disabled={!prevLesson} style={{
                padding: '9px 20px', borderRadius: 50,
                background: 'transparent', border: '1px solid #2A2F35',
                color: prevLesson ? '#F5F5F5' : '#3A3F46',
                fontSize: 13, fontWeight: 500,
                cursor: prevLesson ? 'pointer' : 'not-allowed',
                fontFamily: 'DM Sans, sans-serif',
              }}>Previous</button>

              {currentLesson.type === 'project' ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={runCode} disabled={running || !pyodideReady} style={{
                    padding: '9px 20px', borderRadius: 50,
                    background: running ? '#22262B' : trackColor,
                    border: running ? '1px solid #3A3F46' : 'none',
                    color: running ? '#6B7280' : '#1A1D21',
                    fontSize: 13, fontWeight: 700,
                    cursor: running || !pyodideReady ? 'not-allowed' : 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                    {running ? 'Running...' : pyodideReady ? 'Run Code' : 'Loading Python...'}
                  </button>
                  <button onClick={markComplete} style={{
                    padding: '9px 20px', borderRadius: 50,
                    background: isCompleted ? 'rgba(76,175,125,0.1)' : 'transparent',
                    border: isCompleted ? '1px solid rgba(76,175,125,0.3)' : `1px solid ${trackColor}50`,
                    color: isCompleted ? '#4CAF7D' : trackColor,
                    fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  }}>
                    {isCompleted ? 'Completed' : isLastLesson ? 'Submit & Earn Certificate' : 'Mark Complete'}
                  </button>
                </div>
              ) : (
                <button onClick={markComplete} style={{
                  padding: '9px 24px', borderRadius: 50,
                  background: isCompleted ? 'rgba(76,175,125,0.1)' : trackColor,
                  border: isCompleted ? '1px solid rgba(76,175,125,0.3)' : 'none',
                  color: isCompleted ? '#4CAF7D' : '#1A1D21',
                  fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}>
                  {isCompleted ? 'Completed' : isLastLesson ? 'Finish & Earn Certificate' : nextLesson ? 'Mark Complete' : 'Complete Course'}
                </button>
              )}

              <button onClick={() => nextLesson && switchLesson(nextLesson)} disabled={!nextLesson} style={{
                padding: '9px 20px', borderRadius: 50,
                background: 'transparent', border: '1px solid #2A2F35',
                color: nextLesson ? '#F5F5F5' : '#3A3F46',
                fontSize: 13, fontWeight: 500,
                cursor: nextLesson ? 'pointer' : 'not-allowed',
                fontFamily: 'DM Sans, sans-serif',
              }}>Next</button>
            </div>
          </div>

          {/* RIGHT: Code or Monaco */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', background: '#1A1D21', borderBottom: '1px solid #2A2F35',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#6B7280', marginLeft: 8 }}>
                  {currentLesson.code_label || 'example.py'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3A3F46', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {currentLesson.language || 'python'}
                </span>
                {currentLesson.type !== 'project' && (
                  <button onClick={copyCode} style={{
                    background: copied ? 'rgba(76,175,125,0.15)' : 'rgba(213,156,16,0.1)',
                    border: copied ? '1px solid rgba(76,175,125,0.3)' : '1px solid rgba(213,156,16,0.2)',
                    borderRadius: 20, padding: '4px 14px',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    color: copied ? '#4CAF7D' : '#D59C10', cursor: 'pointer',
                  }}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
                {currentLesson.type === 'project' && (
                  <button onClick={() => setCode(currentLesson.starter_code || '')} style={{
                    background: 'transparent', border: '1px solid #2A2F35',
                    borderRadius: 20, padding: '4px 12px',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                    color: '#6B7280', cursor: 'pointer',
                  }}>Reset</button>
                )}
              </div>
            </div>

            {currentLesson.type === 'project' ? (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Editor
                  height="100%"
                  language={currentLesson.language || 'python'}
                  value={code}
                  onChange={val => setCode(val || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    fontFamily: 'JetBrains Mono, monospace',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    padding: { top: 16, bottom: 16 },
                    wordWrap: 'on',
                    tabSize: 4,
                    automaticLayout: true,
                  }}
                />
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#1A1D21' }}>
                <pre style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                  lineHeight: 1.75, color: '#E5E7EB', margin: 0,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {currentLesson.code || '// No code example for this lesson'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}