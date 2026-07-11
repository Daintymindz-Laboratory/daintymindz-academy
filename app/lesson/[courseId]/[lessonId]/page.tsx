'use client';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import LessonContent from '@/components/LessonContent';
import QuizLesson from '@/components/QuizLesson';
import MiniProjectLesson from '@/components/MiniProjectLesson';
import ProjectLesson from '@/components/ProjectLesson';
import LessonSubmission from '@/components/LessonSubmission';
import { useUser, updateStreak } from '@/lib/user-context';
import { notify } from '@/lib/notify';
import NotificationBell from '@/components/NotificationBell';
import CourseComments from '@/components/CourseComments';
import MessageCenter from '@/components/MessageCenter';
import CourseRating from '@/components/CourseRating';


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
  requires_review: boolean;
};

type Course = {
  id: number;
  title: string;
  track: string;
  level: string;
  created_by?: string;
};

const TRACK_FALLBACK = { color: '#6B7280' };

const TYPE_COLORS: Record<string, string> = {
  project: '#9B6FD4',
  quiz: '#4E8FD4',
  mini_project: '#E86F4E',
  assessment: '#4E8FD4',
  lesson: '#D59C10',
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
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const { tracks, setUser } = useUser();
  const [showRating, setShowRating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dm-sidebar-collapsed') === '1';
    return false;
  });
  const toggleCollapse = () => {
    setSidebarCollapsed(c => {
      const next = !c;
      localStorage.setItem('dm-sidebar-collapsed', next ? '1' : '0');
      return next;
    });
  };
  const [copied, setCopied] = useState(false);

  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const notesSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inlineWorkerRef = useRef<Worker | null>(null);
  const [inlinePyodideReady, setInlinePyodideReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/signin'; return; }
      setUserId(user.id);

      const { data: courseData, error: courseError } = await supabase
        .from('courses').select('*').eq('id', courseId).single();
      if (courseError) { window.location.href = '/dashboard'; return; }
      if (courseData) setCourse(courseData);

      const { data: lessonsData } = await supabase
        .from('lessons').select('*')
        .eq('course_id', courseId).eq('is_published', true).order('order_index');
      if (!lessonsData || lessonsData.length === 0) { setLoading(false); return; }
      setLessons(lessonsData);

      const target = lessonId === '1'
        ? lessonsData[0]
        : (lessonsData.find((l: Lesson) => l.id === parseInt(lessonId)) || lessonsData[0]);
      if (target) {
        setCurrentLesson(target);
        const { data: noteData } = await supabase.from('lesson_notes').select('note').eq('user_id', user.id).eq('lesson_id', target.id).maybeSingle();
        setNoteText(noteData?.note || '');
      }

      const { data: progressData } = await supabase
        .from('progress').select('completed_lessons')
        .eq('user_id', user.id).eq('course_id', courseId).maybeSingle();
      if (progressData?.completed_lessons) {
        setCompletedIds((progressData.completed_lessons as any[]).map(Number));
      }
      setLoading(false);
    };
    init();
  }, [courseId, lessonId]);

  useEffect(() => {
    if (currentLesson?.type !== 'lesson' || !currentLesson?.content?.includes('python-run') || inlineWorkerRef.current) return;
    const worker = new Worker('/pyodide-worker.js');
    inlineWorkerRef.current = worker;
    worker.onmessage = (e) => { if (e.data.type === 'ready') setInlinePyodideReady(true); };
    return () => { worker.terminate(); inlineWorkerRef.current = null; };
  }, [currentLesson]);

  const loadNote = async (lessonId: number, uid: string) => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data } = await supabase.from('lesson_notes').select('note').eq('user_id', uid).eq('lesson_id', lessonId).maybeSingle();
    setNoteText(data?.note || '');
  };

  const saveNote = async (text: string, lid: number, uid: string) => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { error } = await supabase.from('lesson_notes').upsert(
      { user_id: uid, lesson_id: lid, note: text, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );
    if (error) {
      console.error('note save error:', error);
    } else {
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    }
  };

  const handleNoteChange = (text: string) => {
    setNoteText(text);
    setNotesSaved(false);
    if (notesSaveRef.current) clearTimeout(notesSaveRef.current);
    notesSaveRef.current = setTimeout(() => {
      if (currentLesson && userId) saveNote(text, Number(currentLesson.id), userId);
    }, 1200);
  };

  const switchLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setSidebarOpen(false);
    setNoteText('');
    if (userId) {
      loadNote(Number(lesson.id), userId);
      updateStreak(userId).then(streak => setUser({ streak }));
    }
    window.history.pushState({}, '', `/lesson/${courseId}/${lesson.id}`);
  };

  const markComplete = async () => {
    if (!currentLesson || !userId) return;
    const lessonIdNum = Number(currentLesson.id);
    const safe = completedIds.map(Number);
    const newCompleted = safe.includes(lessonIdNum) ? safe : [...safe, lessonIdNum];
    setCompletedIds(newCompleted);
    updateStreak(userId).then(streak => setUser({ streak }));

    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const percentage = Math.round((newCompleted.length / lessons.length) * 100);

    const { data: existing } = await supabase
      .from('progress').select('id')
      .eq('user_id', userId).eq('course_id', courseId).maybeSingle();

    if (existing) {
      await supabase.from('progress').update({
        completed_lessons: newCompleted, percentage,
        lesson_index: currentLesson.order_index,
        last_accessed: new Date().toISOString(),
      }).eq('user_id', userId).eq('course_id', courseId);
    } else {
      await supabase.from('progress').insert({
        user_id: userId, course_id: parseInt(courseId),
        completed_lessons: newCompleted, percentage,
        lesson_index: currentLesson.order_index,
      });
    }

    if (newCompleted.length === lessons.length) {
      const certId = `CERT-DM-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      await supabase.from('certificates').insert({ user_id: userId, course_id: parseInt(courseId), cert_id: certId });
      notify({ userId, type: 'course_completed', title: 'Course completed!', message: `Congratulations! You completed "${course?.title}" and earned a certificate.`, link: '/certificates' });
      notify({ adminBroadcast: true, type: 'course_completed', title: 'Student completed a course', message: `A student completed "${course?.title}".`, link: '/admin' });
      setShowRating(true);
    } else {
      // Gated lesson types (quiz, mini_project) stay on the current lesson
      // after passing so the student can review their work. The Next button
      // becomes enabled once isCompleted is true.
      const gated = ['quiz', 'mini_project', 'project'];
      if (nextLesson && !gated.includes(currentLesson.type)) switchLesson(nextLesson);
    }
  };


  const copyCode = () => { navigator.clipboard.writeText(currentLesson?.code || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const trackColor = course ? (tracks[course.track]?.color || TRACK_FALLBACK.color) : TRACK_FALLBACK.color;
  const currentIdx = lessons.findIndex(l => l.id === currentLesson?.id);
  const prevLesson = currentIdx > 0 ? lessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < lessons.length - 1 ? lessons[currentIdx + 1] : null;
  const isCompleted = currentLesson ? completedIds.map(Number).includes(Number(currentLesson.id)) : false;
  const isLastLesson = currentIdx === lessons.length - 1;

  if (loading) return <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D59C10', fontSize: 13 }}>Loading lesson...</div></div>;
  if (!currentLesson) return <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6B7280', fontSize: 13, marginBottom: 16 }}>No published lessons yet.</div><a href="/my-courses" style={{ color: '#D59C10', textDecoration: 'none', fontSize: 14 }}>Back to my courses</a></div></div>;

  const embedUrl = getVideoEmbed(currentLesson.video_url || '');
  const lessonType = currentLesson.type;
  const typeColor = TYPE_COLORS[lessonType] || '#D59C10';
  const GATED_TYPES = ['quiz', 'mini_project'];
  const needsPass = GATED_TYPES.includes(lessonType) || currentLesson.requires_review;
  const canProceed = !needsPass || isCompleted;

  const prevBtn = <button onClick={() => prevLesson && switchLesson(prevLesson)} disabled={!prevLesson} style={{ padding: '9px 20px', borderRadius: 50, background: 'transparent', border: '1px solid #2A2F35', color: prevLesson ? '#F5F5F5' : '#3A3F46', fontSize: 13, fontWeight: 500, cursor: prevLesson ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif' }}>Previous</button>;
  const nextBtn = <button onClick={() => canProceed && nextLesson && switchLesson(nextLesson)} disabled={!nextLesson || !canProceed} style={{ padding: '9px 20px', borderRadius: 50, background: 'transparent', border: `1px solid ${!canProceed ? 'transparent' : '#2A2F35'}`, color: (!nextLesson || !canProceed) ? '#3A3F46' : '#F5F5F5', fontSize: 13, fontWeight: 500, cursor: (!nextLesson || !canProceed) ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Next</button>;
  const simpleNavBar = (
    <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #2A2F35', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 10 }}>
      {prevBtn}
      {needsPass && !isCompleted && nextLesson && (
        <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
          {currentLesson.requires_review
            ? 'Submit your work and wait for approval to continue'
            : `Pass this ${lessonType === 'quiz' ? 'quiz' : 'mini project'} to continue`}
        </span>
      )}
      {!needsPass && <div />}
      {nextBtn}
    </div>
  );

  return (
    <div style={{ background: '#1A1D21', height: '100vh', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <nav style={{ height: 56, background: '#1A1D21', borderBottom: '1px solid #2A2F35', display: 'flex', alignItems: 'center', padding: '0 1.25rem', gap: 12, flexShrink: 0, zIndex: 50 }}>
        <button onClick={() => { if (window.innerWidth < 769) setSidebarOpen(o => !o); else toggleCollapse(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 18, padding: 4 }}>☰</button>
        <a href="/my-courses" style={{ textDecoration: 'none' }}><Image src="/logo.png" alt="Daintymindz" width={88} height={32} style={{ objectFit: 'contain' }} /></a>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <a href="/my-courses" style={{ fontSize: 13, color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F5F5F5')}
          onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
        >{course?.title}</a>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 13, color: '#F5F5F5', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentLesson.title}</span>
        <div style={{ flex: 1 }} />
        <div className="dm-hide-mobile" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B7280' }}>{completedIds.length}/{lessons.length} complete</div>
        <div className="dm-hide-mobile" style={{ width: 100, height: 4, background: '#2A2F35', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ width: `${(completedIds.length / lessons.length) * 100}%`, height: '100%', background: trackColor, borderRadius: 10, transition: 'width 0.4s' }} />
        </div>
        <button onClick={() => setNotesOpen(o => !o)} style={{
          background: notesOpen ? 'rgba(213,156,16,0.1)' : 'transparent',
          border: notesOpen ? '1px solid rgba(213,156,16,0.3)' : '1px solid #2A2F35',
          borderRadius: 20, padding: '5px 14px', color: notesOpen ? '#D59C10' : '#6B7280',
          fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}>Notes</button>
        <NotificationBell userId={userId} />
        <a href="/dashboard" style={{ color: '#6B7280', fontSize: 13, textDecoration: 'none', border: '1px solid #2A2F35', borderRadius: 20, padding: '5px 14px' }}>Dashboard</a>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div className={`dm-sidebar-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`dm-lesson-sidebar${sidebarOpen ? ' open' : ''}${sidebarCollapsed ? ' dm-collapsed' : ''}`}>
          <div style={{ padding: '1.25rem 1rem 0.75rem', borderBottom: '1px solid #2A2F35' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Course content</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5', lineHeight: 1.3 }}>{course?.title}</div>
          </div>
          <div style={{ padding: '0.75rem 0' }}>
            {lessons.map((lesson, idx) => {
              const isDone = completedIds.map(Number).includes(Number(lesson.id));
              const isCurrent = lesson.id === currentLesson.id;
              const lColor = TYPE_COLORS[lesson.type] || '#D59C10';
              return (
                <div key={lesson.id} onClick={() => switchLesson(lesson)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', cursor: 'pointer', background: isCurrent ? `${trackColor}10` : 'transparent', borderLeft: isCurrent ? `3px solid ${trackColor}` : '3px solid transparent', transition: 'all 0.15s' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: isDone ? 'rgba(76,175,125,0.15)' : isCurrent ? `${trackColor}20` : '#22262B', border: isDone ? '1px solid rgba(76,175,125,0.4)' : isCurrent ? `1px solid ${trackColor}50` : '1px solid #3A3F46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: isDone ? '#4CAF7D' : isCurrent ? trackColor : '#3A3F46' }}>
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? '#F5F5F5' : isDone ? '#6B7280' : '#9CA3AF', lineHeight: 1.35, marginBottom: 3 }}>{lesson.title}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, fontFamily: 'JetBrains Mono, monospace', background: `${lColor}12`, color: lColor }}>{lesson.type.replace('_', ' ').toUpperCase()}</span>
                      {lesson.video_url && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, fontFamily: 'JetBrains Mono, monospace', background: 'rgba(78,143,212,0.1)', color: '#4E8FD4' }}>VIDEO</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {lessonType === 'project' ? (
          <div className="dm-lesson-main">
            <ProjectLesson
              key={currentLesson.id}
              lessonId={Number(currentLesson.id)}
              courseId={Number(courseId)}
              userId={userId}
              trackColor={trackColor}
              starterCode={currentLesson.starter_code || ''}
              instructions={currentLesson.instructions || ''}
              language={currentLesson.language || 'python'}
              codeLabel={currentLesson.code_label || 'solution.py'}
              embedUrl={embedUrl}
              isCompleted={isCompleted}
              requiresReview={currentLesson.requires_review}
              onComplete={markComplete}
            />
            {simpleNavBar}
          </div>
        ) : lessonType === 'quiz' ? (
          <div className="dm-lesson-main">
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <QuizLesson lessonId={Number(currentLesson.id)} userId={userId} trackColor={trackColor} introduction={currentLesson.content || ''} isCompleted={isCompleted} onComplete={markComplete} />
            </div>
            {simpleNavBar}
          </div>
        ) : lessonType === 'mini_project' ? (
          <div className="dm-lesson-main">
            <MiniProjectLesson key={currentLesson.id} lessonId={Number(currentLesson.id)} courseId={Number(courseId)} userId={userId} trackColor={trackColor} starterCode={currentLesson.starter_code || ''} instructions={currentLesson.instructions || ''} isCompleted={isCompleted} onComplete={markComplete} />
            {simpleNavBar}
          </div>
        ) : (
          <div className="dm-lesson-main">
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem', maxWidth: 800, width: '100%', margin: '0 auto' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: trackColor, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Lesson {currentIdx + 1} of {lessons.length}</div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F5', lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.02em' }}>{currentLesson.title}</h1>
              </div>
              {embedUrl && <div style={{ marginBottom: '1.5rem', borderRadius: 12, overflow: 'hidden', border: '1px solid #2A2F35' }}><iframe src={embedUrl} width="100%" height="315" style={{ display: 'block', border: 'none' }} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" /></div>}
              {currentLesson.content && <LessonContent content={currentLesson.content} trackColor={trackColor} workerRef={inlineWorkerRef} pyodideReady={inlinePyodideReady} />}
              {currentLesson.code && (
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#161B22', borderRadius: '10px 10px 0 0', border: '1px solid #2A2F35', borderBottom: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3A3F46' }} /><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3A3F46' }} /><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3A3F46' }} /></div>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B7280', marginLeft: 4 }}>{currentLesson.code_label || 'example.py'}</span>
                    </div>
                    <button onClick={copyCode} style={{ background: copied ? 'rgba(76,175,125,0.15)' : 'rgba(213,156,16,0.1)', border: copied ? '1px solid rgba(76,175,125,0.3)' : '1px solid rgba(213,156,16,0.2)', borderRadius: 20, padding: '3px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: copied ? '#4CAF7D' : '#D59C10', cursor: 'pointer' }}>{copied ? 'Copied!' : 'Copy'}</button>
                  </div>
                  <pre style={{ background: '#0D1117', border: '1px solid #2A2F35', borderRadius: '0 0 10px 10px', padding: '1rem 1.25rem', margin: 0, overflowX: 'auto' }}>
                    <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#E5E7EB', lineHeight: 1.75 }}>{currentLesson.code}</code>
                  </pre>
                </div>
              )}
              {currentLesson.requires_review && (
                <LessonSubmission
                  key={currentLesson.id}
                  lessonId={Number(currentLesson.id)}
                  userId={userId}
                  trackColor={trackColor}
                  isCompleted={isCompleted}
                  onComplete={markComplete}
                />
              )}
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #2A2F35', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 10 }}>
              {prevBtn}
              {currentLesson.requires_review ? (
                <span style={{ fontSize: 12, color: isCompleted ? '#4CAF7D' : '#6B7280', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>
                  {isCompleted ? 'Approved' : 'Submit above and wait for approval to continue'}
                </span>
              ) : (
                <button onClick={markComplete} style={{ padding: '9px 24px', borderRadius: 50, background: isCompleted ? 'rgba(76,175,125,0.1)' : trackColor, border: isCompleted ? '1px solid rgba(76,175,125,0.3)' : 'none', color: isCompleted ? '#4CAF7D' : '#1A1D21', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{isCompleted ? 'Completed' : isLastLesson ? 'Finish & Earn Certificate' : 'Mark Complete'}</button>
              )}
              {nextBtn}
            </div>
          </div>
        )}
      </div>

      {/* Discussion + Messages drawer */}
      {course && userId && (
        <DiscussionDrawer courseId={course.id} userId={userId} trackColor={trackColor} instructorId={course.created_by} />
      )}
      </div>

      {/* Notes panel */}
      {notesOpen && (
        <div style={{
          position: 'fixed', top: 56, right: 0, bottom: 0, width: 320,
          background: '#22262B', borderLeft: '1px solid #2A2F35',
          display: 'flex', flexDirection: 'column', zIndex: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #2A2F35' }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: trackColor, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Notes</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{currentLesson.title}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {notesSaved && <span style={{ fontSize: 11, color: '#4CAF7D', fontFamily: 'JetBrains Mono, monospace' }}>Saved</span>}
              <button onClick={() => setNotesOpen(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>x</button>
            </div>
          </div>
          <textarea
            name="lesson-notes"
            value={noteText}
            onChange={e => handleNoteChange(e.target.value)}
            placeholder={'Write your notes here...\n\nThey are saved automatically.'}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              padding: '16px', fontFamily: 'DM Sans, sans-serif', fontSize: 14,
              color: '#E5E7EB', lineHeight: 1.7, resize: 'none',
            }}
          />
        </div>
      )}

      {showRating && course && userId && (
        <CourseRating
          courseId={course.id}
          userId={userId}
          courseTitle={course.title}
          trackColor={trackColor}
          onDone={() => { setShowRating(false); window.location.href = '/certificates'; }}
        />
      )}
    </div>
  );
}

function DiscussionDrawer({ courseId, userId, trackColor, instructorId }: { courseId: number; userId: string; trackColor: string; instructorId?: string }) {
  const [tab, setTab] = useState<'comments' | 'messages'>('comments');
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: '#1A1D21', borderTop: '1px solid #2A2F35', boxShadow: '0 -4px 24px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 20px', borderBottom: open ? '1px solid #2A2F35' : 'none' }}>
        {(['comments', 'messages'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setOpen(true); }} style={{ background: 'none', border: 'none', borderBottom: open && tab === t ? `2px solid ${trackColor}` : '2px solid transparent', padding: '10px 16px', fontSize: 13, fontWeight: 600, color: open && tab === t ? trackColor : '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginBottom: -1 }}>
            {t === 'comments' ? 'Discussion' : 'Messages'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 18, padding: '8px', fontFamily: 'DM Sans, sans-serif' }}>
          {open ? 'v' : '^'}
        </button>
      </div>
      {open && (
        <div style={{ height: 400, overflowY: 'auto', padding: tab === 'comments' ? '20px 24px' : '0' }}>
          {tab === 'comments' && <CourseComments courseId={courseId} userId={userId} trackColor={trackColor} />}
          {tab === 'messages' && <MessageCenter userId={userId} isAdmin={false} trackColor={trackColor} instructorId={instructorId} />}
        </div>
      )}
    </div>
  );
}