'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FALLBACK_TRACKS as BASE_FALLBACK_TRACKS } from '@/lib/user-context';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

type Course = {
  id?: number;
  title: string;
  track: string;
  level: string;
  lessons_count: number;
  duration: string;
  description: string;
  created_by?: string | null;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  track: string;
  created_at: string;
};

type Lesson = {
  id?: number;
  course_id: number;
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

type Submission = {
  id: number;
  user_id: string;
  lesson_id: number;
  course_id: number;
  lesson_type: string;
  submitted_code: string;
  notes: string | null;
  status: 'pending' | 'approved' | 'rework';
  feedback: string | null;
  submitted_at: string;
  student_name: string;
  course_title: string;
  lesson_title: string;
};

const FALLBACK_TRACKS: Record<string, { label: string; color: string }> = Object.fromEntries(
  Object.entries(BASE_FALLBACK_TRACKS).map(([k, v]) => [k, { label: v.label, color: v.color }])
);

type Track = { code: string; label: string; color: string };

const EMPTY_COURSE: Course = {
  title: '', track: 'AI', level: 'Beginner',
  lessons_count: 0, duration: '', description: '',
};

export default function AdminPage() {
  type Analytics = {
    totalStudents: number;
    totalEnrollments: number;
    totalCerts: number;
    enrollmentsByCourse: { title: string; track: string; count: number }[];
    avgCompletionByCourse: { title: string; track: string; avg: number }[];
  };

  type StudentDetail = {
    student: Profile;
    enrollments: { course_id: number; course_title: string; track: string; progress: number }[];
    certs: { cert_id: string; course_title: string; issued_at: string }[];
  };

  const [adminName, setAdminName] = useState('');
  const [adminId, setAdminId] = useState('');
  const [adminPosition, setAdminPosition] = useState('');
  const [adminProfileSaving, setAdminProfileSaving] = useState(false);
  const [adminProfiles, setAdminProfiles] = useState<{ id: string; full_name: string; position: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'students' | 'lessons' | 'analytics' | 'tracks' | 'submissions'>('courses');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tracks, setTracks] = useState<Track[]>(Object.entries(FALLBACK_TRACKS).map(([code, t]) => ({ code, ...t })));
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [savingTrack, setSavingTrack] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course>(EMPTY_COURSE);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
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
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);

  type QuizQuestion = {
    id?: number;
    lesson_id: number;
    order_index: number;
    question_text: string;
    question_type: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  };
  type TestCase = {
    id?: number;
    lesson_id: number;
    order_index: number;
    description: string;
    test_code: string;
    expected_output: string;
  };

  const [pendingCount, setPendingCount] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [grading, setGrading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [savingTestCase, setSavingTestCase] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/signin'; return; }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profile?.is_admin) { window.location.href = '/dashboard'; return; }
      setAdminName(profile.full_name);
      setAdminId(user.id);
      setAdminPosition(profile.position || '');
      await loadTracks(supabase);
      await loadCourses(supabase);
      await loadStudents(supabase);
      await loadAnalytics(supabase);
      await loadSubmissions(supabase);
      const { data: admins } = await supabase.from('profiles').select('id, full_name, position').eq('is_admin', true).order('full_name');
      if (admins) setAdminProfiles(admins);
      setLoading(false);
    };
    init();
  }, []);

  const tracksMap = Object.fromEntries(tracks.map(t => [t.code, { label: t.label, color: t.color }]));

  const loadTracks = async (supabase: any) => {
    const { data } = await supabase.from('tracks').select('*').order('code');
    if (data && data.length > 0) setTracks(data);
  };

  const saveTrack = async () => {
    if (!editingTrack) return;
    if (!editingTrack.code.trim() || !editingTrack.label.trim()) { showToast('Code and label are required.'); return; }
    const code = editingTrack.code.trim().toUpperCase().replace(/\s+/g, '_');
    setSavingTrack(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const isNew = !tracks.find(t => t.code === editingTrack.code);
    if (isNew) {
      const { error } = await supabase.from('tracks').insert({ code, label: editingTrack.label.trim(), color: editingTrack.color });
      if (error) { showToast(`Error: ${error.message}`); setSavingTrack(false); return; }
    } else {
      const { error } = await supabase.from('tracks').update({ label: editingTrack.label.trim(), color: editingTrack.color }).eq('code', editingTrack.code);
      if (error) { showToast(`Error: ${error.message}`); setSavingTrack(false); return; }
    }
    await loadTracks(supabase);
    setEditingTrack(null);
    setSavingTrack(false);
    showToast('Track saved.');
  };

  const deleteTrack = async (code: string) => {
    if (!confirm(`Delete track "${code}"? Courses using this track will keep their track code.`)) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('tracks').delete().eq('code', code);
    await loadTracks(supabase);
    showToast('Track deleted.');
  };

  const loadSubmissions = async (supabase: any) => {
    const { data, error } = await supabase
      .from('project_submissions')
      .select('*, courses(title), lessons(title)')
      .order('submitted_at', { ascending: false });
    if (error) { console.error('loadSubmissions error:', error); return; }
    if (!data || data.length === 0) { setSubmissions([]); setPendingCount(0); return; }

    const userIds = [...new Set(data.map((s: any) => s.user_id as string))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    const profileMap: Record<string, string> = Object.fromEntries(
      (profilesData || []).map((p: any) => [p.id, p.full_name])
    );

    const mapped = data.map((s: any) => ({
      ...s,
      student_name: profileMap[s.user_id] || 'Unknown',
      course_title: s.courses?.title || '',
      lesson_title: s.lessons?.title || '',
    }));
    setSubmissions(mapped);
    setPendingCount(mapped.filter((s: any) => s.status === 'pending').length);
  };

  const gradeSubmission = async (status: 'approved' | 'rework') => {
    if (!selectedSubmission) return;
    if (status === 'rework' && !gradingFeedback.trim()) { showToast('Please add feedback before returning for rework.'); return; }
    setGrading(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { error } = await supabase.from('project_submissions')
      .update({ status, feedback: gradingFeedback.trim() || null, reviewed_at: new Date().toISOString(), reviewed_by: adminId })
      .eq('id', selectedSubmission.id);
    if (error) { showToast(`Error: ${error.message}`); setGrading(false); return; }
    if (status === 'approved') {
      await supabase.from('progress').upsert(
        { user_id: selectedSubmission.user_id, course_id: selectedSubmission.course_id, lesson_id: selectedSubmission.lesson_id, completed: true },
        { onConflict: 'user_id,course_id' }
      );
    }
    await loadSubmissions(supabase);
    setSelectedSubmission(null);
    setGradingFeedback('');
    setGrading(false);
    showToast(status === 'approved' ? 'Submission approved!' : 'Returned for rework.');
  };

  const loadCourses = async (supabase: any) => {
    const { data } = await supabase.from('courses').select('*').order('id');
    if (data) setCourses(data);
  };

  const loadStudents = async (supabase: any) => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setStudents(data);
  };

  const loadAnalytics = async (supabase: any) => {
    const [
      { data: enrollData },
      { data: progressData },
      { data: certsData },
      { data: coursesData },
    ] = await Promise.all([
      supabase.from('enrollments').select('course_id, user_id'),
      supabase.from('progress').select('course_id, percentage'),
      supabase.from('certificates').select('course_id'),
      supabase.from('courses').select('id, title, track'),
    ]);

    const courseMap: Record<number, { title: string; track: string }> = {};
    (coursesData || []).forEach((c: any) => { courseMap[c.id] = { title: c.title, track: c.track }; });

    const enrollCount: Record<number, number> = {};
    (enrollData || []).forEach((e: any) => { enrollCount[e.course_id] = (enrollCount[e.course_id] || 0) + 1; });

    const progressSum: Record<number, { sum: number; count: number }> = {};
    (progressData || []).forEach((p: any) => {
      if (!progressSum[p.course_id]) progressSum[p.course_id] = { sum: 0, count: 0 };
      progressSum[p.course_id].sum += p.percentage || 0;
      progressSum[p.course_id].count += 1;
    });

    const enrollmentsByCourse = Object.entries(enrollCount)
      .map(([id, count]) => ({ title: courseMap[Number(id)]?.title || '', track: courseMap[Number(id)]?.track || '', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const avgCompletionByCourse = Object.entries(progressSum)
      .map(([id, { sum, count }]) => ({ title: courseMap[Number(id)]?.title || '', track: courseMap[Number(id)]?.track || '', avg: Math.round(sum / count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);

    setAnalytics({
      totalStudents: (await supabase.from('profiles').select('id', { count: 'exact', head: true })).count || 0,
      totalEnrollments: (enrollData || []).length,
      totalCerts: (certsData || []).length,
      enrollmentsByCourse,
      avgCompletionByCourse,
    });
  };

  const openStudentDetail = async (student: Profile) => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const [{ data: enrollData }, { data: progressData }, { data: certsData }, { data: coursesData }] = await Promise.all([
      supabase.from('enrollments').select('course_id').eq('user_id', student.id),
      supabase.from('progress').select('course_id, percentage').eq('user_id', student.id),
      supabase.from('certificates').select('cert_id, course_id, issued_at').eq('user_id', student.id),
      supabase.from('courses').select('id, title, track'),
    ]);
    const courseMap: Record<number, { title: string; track: string }> = {};
    (coursesData || []).forEach((c: any) => { courseMap[c.id] = { title: c.title, track: c.track }; });
    const progressMap: Record<number, number> = {};
    (progressData || []).forEach((p: any) => { progressMap[p.course_id] = p.percentage || 0; });
    const enrollments = (enrollData || []).map((e: any) => ({
      course_id: e.course_id,
      course_title: courseMap[e.course_id]?.title || '',
      track: courseMap[e.course_id]?.track || '',
      progress: progressMap[e.course_id] || 0,
    }));
    const certs = (certsData || []).map((c: any) => ({
      cert_id: c.cert_id,
      course_title: courseMap[c.course_id]?.title || '',
      issued_at: c.issued_at,
    }));
    setSelectedStudent({ student, enrollments, certs });
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    if (!editingLesson?.id) { setQuizQuestions([]); setTestCases([]); return; }
    const load = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      if (editingLesson.type === 'quiz') {
        const { data } = await supabase.from('quiz_questions').select('*').eq('lesson_id', editingLesson.id).order('order_index');
        setQuizQuestions((data || []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]') })));
      } else if (editingLesson.type === 'mini_project' || editingLesson.type === 'project') {
        const { data } = await supabase.from('mini_project_test_cases').select('*').eq('lesson_id', editingLesson.id).order('order_index');
        setTestCases(data || []);
      }
    };
    load();
  }, [editingLesson?.id, editingLesson?.type]);

  const saveQuestion = async () => {
    if (!editingQuestion || !editingLesson?.id) {
      showToast('Save the lesson first before adding questions.');
      return;
    }
    if (!editingQuestion.question_text.trim()) { showToast('Question text is required.'); return; }
    if (!editingQuestion.correct_answer.trim()) { showToast('Correct answer is required.'); return; }
    const filledOptions = editingQuestion.options.filter(o => o.trim());
    if (filledOptions.length < 2) { showToast('Add at least 2 options.'); return; }
    if (!filledOptions.includes(editingQuestion.correct_answer.trim())) {
      showToast('Correct answer must exactly match one of the options.');
      return;
    }
    setSavingQuestion(true);
    try {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const payload = {
      lesson_id: editingLesson.id,
      order_index: editingQuestion.order_index,
      question_text: editingQuestion.question_text.trim(),
      question_type: editingQuestion.question_type,
      options: filledOptions,
      correct_answer: editingQuestion.correct_answer.trim(),
      explanation: editingQuestion.explanation?.trim() || null,
    };
    let saveError: any = null;
    if (editingQuestion.id) {
      const { error } = await supabase.from('quiz_questions').update(payload).eq('id', editingQuestion.id);
      saveError = error;
    } else {
      const { error } = await supabase.from('quiz_questions').insert(payload);
      saveError = error;
    }
    if (saveError) {
      showToast(`Error: ${saveError.message}`);
      setSavingQuestion(false);
      return;
    }
    const { data } = await supabase.from('quiz_questions').select('*').eq('lesson_id', editingLesson.id).order('order_index');
    setQuizQuestions((data || []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]') })));
    setEditingQuestion(null);
    setSavingQuestion(false);
    showToast('Question saved.');
    } catch (err: any) {
      showToast(`Unexpected error: ${err?.message || String(err)}`);
      setSavingQuestion(false);
    }
  };

  const deleteQuestion = async (id: number) => {
    if (!editingLesson?.id) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('quiz_questions').delete().eq('id', id);
    const { data } = await supabase.from('quiz_questions').select('*').eq('lesson_id', editingLesson.id).order('order_index');
    setQuizQuestions((data || []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]') })));
    showToast('Question deleted.');
  };

  const saveTestCase = async () => {
    if (!editingTestCase || !editingLesson?.id) return;
    if (!editingTestCase.description || !editingTestCase.test_code || !editingTestCase.expected_output) { showToast('Fill in all test case fields.'); return; }
    setSavingTestCase(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const payload = {
      lesson_id: editingLesson.id,
      order_index: editingTestCase.order_index,
      description: editingTestCase.description,
      test_code: editingTestCase.test_code,
      expected_output: editingTestCase.expected_output,
    };
    if (editingTestCase.id) {
      await supabase.from('mini_project_test_cases').update(payload).eq('id', editingTestCase.id);
    } else {
      await supabase.from('mini_project_test_cases').insert(payload);
    }
    const { data } = await supabase.from('mini_project_test_cases').select('*').eq('lesson_id', editingLesson.id).order('order_index');
    setTestCases(data || []);
    setEditingTestCase(null);
    setSavingTestCase(false);
    showToast('Test case saved.');
  };

  const deleteTestCase = async (id: number) => {
    if (!editingLesson?.id) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('mini_project_test_cases').delete().eq('id', id);
    const { data } = await supabase.from('mini_project_test_cases').select('*').eq('lesson_id', editingLesson.id).order('order_index');
    setTestCases(data || []);
    showToast('Test case deleted.');
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
        created_by: editingCourse.created_by || adminId,
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
        created_by: editingCourse.created_by || adminId,
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

  const loadLessons = async (courseId: number) => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');
    if (data) setLessons(data);
  };

  const openCourse = async (course: Course) => {
    setSelectedCourse(course);
    setActiveTab('lessons');
    await loadLessons(course.id!);
  };

  const saveLesson = async () => {
    if (!editingLesson || !selectedCourse) return;
    if (!editingLesson.title) { showToast('Please enter a lesson title.'); return; }
    setSavingLesson(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    if (editingLesson.id) {
      const { error } = await supabase.from('lessons').update({
        title: editingLesson.title,
        type: editingLesson.type,
        content: editingLesson.content,
        code: editingLesson.code,
        code_label: editingLesson.code_label,
        language: editingLesson.language,
        starter_code: editingLesson.starter_code,
        instructions: editingLesson.instructions,
        video_url: editingLesson.video_url,
        order_index: editingLesson.order_index,
        is_published: editingLesson.is_published,
        requires_review: editingLesson.requires_review,
      }).eq('id', editingLesson.id);
      if (error) { showToast(`Error: ${error.message}`); setSavingLesson(false); return; }
      showToast('Lesson updated!');
      await loadLessons(selectedCourse.id!);
      setSavingLesson(false);
    } else {
      const { data: inserted, error } = await supabase.from('lessons').insert({
        course_id: selectedCourse.id,
        title: editingLesson.title,
        type: editingLesson.type,
        content: editingLesson.content,
        code: editingLesson.code,
        code_label: editingLesson.code_label,
        language: editingLesson.language,
        starter_code: editingLesson.starter_code,
        instructions: editingLesson.instructions,
        video_url: editingLesson.video_url,
        order_index: lessons.length + 1,
        is_published: editingLesson.is_published,
        requires_review: editingLesson.requires_review,
      }).select().single();
      if (error) { showToast(`Error: ${error.message}`); setSavingLesson(false); return; }
      setEditingLesson(inserted);
      await loadLessons(selectedCourse.id!);
      setSavingLesson(false);
      if (inserted.type === 'quiz') {
        showToast('Lesson created! Now add your questions below.');
      } else if (inserted.type === 'mini_project' || inserted.type === 'project') {
        showToast('Lesson created! Now add your test cases below.');
      } else {
        showToast('Lesson created!');
      }
    }
  };

  const deleteLesson = async (id: number) => {
    if (!confirm('Delete this lesson?')) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('lessons').delete().eq('id', id);
    await loadLessons(selectedCourse!.id!);
    showToast('Lesson deleted.');
  };

  const togglePublish = async (lesson: Lesson) => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('lessons').update({ is_published: !lesson.is_published }).eq('id', lesson.id!);
    await loadLessons(selectedCourse!.id!);
    showToast(lesson.is_published ? 'Lesson unpublished.' : 'Lesson published!');
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
        <button onClick={() => { if (window.innerWidth < 769) setSidebarOpen(o => !o); else toggleCollapse(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 20, padding: 4 }}>☰</button>
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

        {/* Mobile backdrop */}
        <div className={`dm-sidebar-backdrop${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* SIDEBAR */}
        <aside className={`dm-sidebar${sidebarOpen ? ' open' : ''}${sidebarCollapsed ? ' dm-collapsed' : ''}`} style={{ top: 60, padding: '1.5rem 0' }}>
          <div style={{ padding: '0 1rem' }}>
            <div style={{ fontSize: 10, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Admin</div>
            {[
              { id: 'courses', label: 'Course Manager', icon: '◎' },
              { id: 'lessons', label: 'Lesson Builder', icon: '✦' },
              { id: 'students', label: 'Students', icon: '⊞' },
              { id: 'analytics', label: 'Analytics', icon: '◈' },
              { id: 'tracks', label: 'Tracks', icon: '◑' },
              { id: 'submissions', label: 'Submissions', icon: '◧' },
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
                {item.id === 'submissions' && pendingCount > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#D59C10', color: '#1A1D21', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 7px', fontFamily: 'JetBrains Mono, monospace' }}>{pendingCount}</span>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <main className={`dm-main${sidebarCollapsed ? ' dm-collapsed' : ''}`} style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto' }}>

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

              {showForm && (
                <div id="course-form" style={{
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
                        {tracks.map(t => (
                          <option key={t.code} value={t.code}>{t.label}</option>
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
                    <div>
                      <label style={labelStyle}>Course Creator (for certificate)</label>
                      <select style={{ ...inputStyle, cursor: 'pointer' }} value={editingCourse.created_by || adminId} onChange={e => setEditingCourse(p => ({ ...p, created_by: e.target.value }))}>
                        {adminProfiles.map(a => (
                          <option key={a.id} value={a.id}>{a.full_name}{a.position ? ` (${a.position})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Description *</label>
                      <textarea
                        name="course-description"
                        value={editingCourse.description}
                        onChange={e => setEditingCourse(p => ({ ...p, description: e.target.value }))}
                        placeholder="A short description of what students will learn..."
                        rows={3}
                        style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical' as const, lineHeight: 1.6 }}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {courses.map(course => {
                  const track = tracksMap[course.track];
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
                        <button onClick={() => openCourse(course)} style={{
                          background: 'rgba(213,156,16,0.08)', border: '1px solid rgba(213,156,16,0.2)',
                          borderRadius: 20, padding: '6px 16px',
                          fontSize: 12, color: '#D59C10', cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}>Lessons</button>
                        <button onClick={() => {
                          setEditingCourse(course);
                          setShowForm(true);
                          setTimeout(() => document.getElementById('course-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                        }} style={{
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

          {/* LESSON BUILDER */}
          {activeTab === 'lessons' && (
            <div>
              {!selectedCourse ? (
                <div style={{ textAlign: 'center', padding: '5rem 0', color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                  {'// select a course from Course Manager to build lessons'}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <button onClick={() => { setActiveTab('courses'); setSelectedCourse(null); }} style={{
                          background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer',
                          fontSize: 13, fontFamily: 'DM Sans, sans-serif', padding: 0,
                        }}>Course Manager</button>
                        <span style={{ color: '#3A3F46' }}>›</span>
                        <span style={{ fontSize: 13, color: '#D59C10' }}>{selectedCourse.title}</span>
                      </div>
                      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em' }}>Lesson Builder</h1>
                      <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                        {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} · {selectedCourse.track} · {selectedCourse.level}
                      </p>
                    </div>
                    <button onClick={() => {
                      setEditingLesson({
                        course_id: selectedCourse.id!,
                        title: '', type: 'lesson',
                        content: '', code: '', code_label: 'example.py',
                        language: 'python',
                        starter_code: '', instructions: '',
                        video_url: '',
                        order_index: lessons.length + 1,
                        is_published: false,
                        requires_review: false,
                      });
                      setShowLessonForm(true);
                    }} style={{
                      background: '#D59C10', border: 'none', borderRadius: 50,
                      padding: '10px 24px', fontSize: 14, fontWeight: 700,
                      color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                    }}>+ New Lesson</button>
                  </div>

                  {/* Lesson form */}
                  {showLessonForm && editingLesson && (
                    <div style={{
                      background: '#22262B', border: '1px solid #2A2F35',
                      borderRadius: 20, padding: '1.75rem 2rem', marginBottom: '2rem',
                    }}>
                      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F5F5F5', marginBottom: '1.5rem' }}>
                        {editingLesson.id ? 'Edit Lesson' : 'New Lesson'}
                      </h2>
                      <div style={{ display: 'grid', gap: 16 }}>

                        {/* Title, type, order */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Lesson Title *</label>
                            <input style={inputStyle} value={editingLesson.title}
                              onChange={e => setEditingLesson(p => p ? ({ ...p, title: e.target.value }) : p)}
                              placeholder="e.g. What is Machine Learning?" />
                          </div>
                          <div>
                            <label style={labelStyle}>Lesson Type</label>
                            <select style={{ ...inputStyle, cursor: 'pointer' }} value={editingLesson.type}
                              onChange={e => setEditingLesson(p => p ? ({ ...p, type: e.target.value }) : p)}>
                              <option value="lesson">Lesson (article + code)</option>
                              <option value="project">Project (Monaco editor)</option>
                              <option value="quiz">Quiz (auto-graded, 80% pass)</option>
                              <option value="mini_project">Mini Project (code + test cases)</option>
                              <option value="assessment">Assessment (markdown)</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>Order</label>
                            <input style={inputStyle} type="number" value={editingLesson.order_index}
                              onChange={e => setEditingLesson(p => p ? ({ ...p, order_index: parseInt(e.target.value) || 1 }) : p)} />
                          </div>
                        </div>

                        {/* Video URL (all lesson types) */}
                        <div>
                          <label style={labelStyle}>Video URL, YouTube or Loom (optional)</label>
                          <input style={inputStyle} value={editingLesson.video_url}
                            onChange={e => setEditingLesson(p => p ? ({ ...p, video_url: e.target.value }) : p)}
                            placeholder="https://www.youtube.com/watch?v=... or https://www.loom.com/share/..." />
                          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 5, fontFamily: 'JetBrains Mono, monospace' }}>
                            Students will see the video embedded at the top of the lesson.
                          </div>
                        </div>

                        {/* LESSON type fields */}
                        {editingLesson.type === 'lesson' && (
                          <>
                            <div data-color-mode="dark">
                              <label style={{ ...labelStyle, marginBottom: 10 }}>Lesson Content, Markdown supported</label>
                              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>
                                Use # for headings · **bold** · *italic* · - for lists · {'>'} for quotes · ```python-run for interactive cells
                              </div>
                              <MDEditor
                                value={editingLesson.content}
                                onChange={val => setEditingLesson(p => p ? ({ ...p, content: val || '' }) : p)}
                                height={680}
                                preview="live"
                              />
                              {(() => {
                                const raw = editingLesson.content || '';
                                const stripped = raw.replace(/```[\s\S]*?```/g, '').replace(/[#*_`>\-\[\]!|]/g, ' ').trim();
                                const words = stripped ? stripped.split(/\s+/).filter(Boolean).length : 0;
                                const mins = Math.max(1, Math.round(words / 200));
                                if (words === 0) return null;
                                return (
                                  <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', marginTop: 6 }}>
                                    {words.toLocaleString()} words, about {mins} min read
                                  </div>
                                );
                              })()}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16 }}>
                              <div>
                                <label style={labelStyle}>Code Example (shown on right panel)</label>
                                <textarea name="lesson-code" value={editingLesson.code}
                                  onChange={e => setEditingLesson(p => p ? ({ ...p, code: e.target.value }) : p)}
                                  placeholder="# Python code shown alongside the lesson..."
                                  rows={10}
                                  style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical' as const, lineHeight: 1.7, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                  <label style={labelStyle}>Language</label>
                                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={editingLesson.language}
                                    onChange={e => setEditingLesson(p => p ? ({ ...p, language: e.target.value }) : p)}>
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="typescript">TypeScript</option>
                                    <option value="jsx">React / JSX</option>
                                    <option value="html">HTML</option>
                                    <option value="css">CSS</option>
                                    <option value="c">C</option>
                                    <option value="cpp">C++</option>
                                    <option value="csharp">C#</option>
                                    <option value="java">Java</option>
                                    <option value="r">R</option>
                                    <option value="sql">SQL</option>
                                    <option value="bash">Bash / Shell</option>
                                    <option value="latex">LaTeX</option>
                                  </select>
                                </div>
                                <div>
                                  <label style={labelStyle}>File Label</label>
                                  <input style={inputStyle} value={editingLesson.code_label}
                                    onChange={e => setEditingLesson(p => p ? ({ ...p, code_label: e.target.value }) : p)}
                                    placeholder="example.py" />
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        {/* PROJECT type fields */}
                        {editingLesson.type === 'project' && (
                          <>
                            <div>
                              <label style={labelStyle}>Programming Language</label>
                              <select style={{ ...inputStyle, cursor: 'pointer' }} value={editingLesson.language}
                                onChange={e => setEditingLesson(p => p ? ({ ...p, language: e.target.value }) : p)}>
                                <option value="python">Python</option>
                                <option value="javascript">JavaScript</option>
                                <option value="typescript">TypeScript</option>
                                <option value="jsx">React / JSX</option>
                                <option value="html">HTML</option>
                                <option value="css">CSS</option>
                                <option value="c">C</option>
                                <option value="cpp">C++</option>
                                <option value="csharp">C#</option>
                                <option value="java">Java</option>
                                <option value="r">R</option>
                                <option value="sql">SQL</option>
                                <option value="bash">Bash / Shell</option>
                                <option value="latex">LaTeX</option>
                              </select>
                            </div>
                            <div data-color-mode="dark">
                              <label style={{ ...labelStyle, marginBottom: 10 }}>Project Instructions, Markdown supported</label>
                              <MDEditor
                                value={editingLesson.instructions}
                                onChange={val => setEditingLesson(p => p ? ({ ...p, instructions: val || '' }) : p)}
                                height={300}
                                preview="live"
                              />
                            </div>
                            <div>
                              <label style={labelStyle}>Starter Code (pre-filled in Monaco editor)</label>
                              <textarea name="lesson-starter-code" value={editingLesson.starter_code}
                                onChange={e => setEditingLesson(p => p ? ({ ...p, starter_code: e.target.value }) : p)}
                                placeholder="# Starter code for students..."
                                rows={10}
                                style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical' as const, lineHeight: 1.7, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }} />
                            </div>
                          </>
                        )}

                        {/* ASSESSMENT type fields */}
                        {editingLesson.type === 'assessment' && (
                          <div data-color-mode="dark">
                            <label style={{ ...labelStyle, marginBottom: 10 }}>Assessment Content, Markdown supported</label>
                            <MDEditor
                              value={editingLesson.content}
                              onChange={val => setEditingLesson(p => p ? ({ ...p, content: val || '' }) : p)}
                              height={300}
                              preview="live"
                            />
                          </div>
                        )}

                        {/* QUIZ type fields */}
                        {editingLesson.type === 'quiz' && (
                          <div>
                            <div data-color-mode="dark" style={{ marginBottom: 20 }}>
                              <label style={{ ...labelStyle, marginBottom: 10 }}>Quiz Introduction (optional, Markdown)</label>
                              <MDEditor value={editingLesson.content} onChange={val => setEditingLesson(p => p ? ({ ...p, content: val || '' }) : p)} height={180} preview="live" />
                            </div>
                            {!editingLesson.id ? (
                              <div style={{ padding: '14px 18px', background: 'rgba(213,156,16,0.06)', border: '1px solid rgba(213,156,16,0.2)', borderRadius: 12, fontSize: 13, color: '#D59C10' }}>
                                Save the lesson first to add questions.
                              </div>
                            ) : (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                  <label style={labelStyle}>Quiz Questions ({quizQuestions.length})</label>
                                  <button onClick={() => setEditingQuestion({ lesson_id: editingLesson.id!, order_index: quizQuestions.length + 1, question_text: '', question_type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '', explanation: '' })} style={{ background: '#D59C10', border: 'none', borderRadius: 50, padding: '6px 18px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>+ Add Question</button>
                                </div>
                                {editingQuestion && (
                                  <div style={{ background: '#1A1D21', border: '1px solid #3A3F46', borderRadius: 14, padding: '1.25rem', marginBottom: 16 }}>
                                    <div style={{ marginBottom: 12 }}>
                                      <label style={labelStyle}>Question Type</label>
                                      <select style={{ ...inputStyle, cursor: 'pointer' }} value={editingQuestion.question_type} onChange={e => setEditingQuestion(q => q ? ({ ...q, question_type: e.target.value }) : q)}>
                                        <option value="multiple_choice">Multiple Choice</option>
                                        <option value="code_output">Code Output (shown as code block)</option>
                                      </select>
                                    </div>
                                    <div style={{ marginBottom: 12 }}>
                                      <label style={labelStyle}>Question Text {editingQuestion.question_type === 'code_output' ? '(Python code snippet)' : ''}</label>
                                      <textarea name="question-text" value={editingQuestion.question_text} onChange={e => setEditingQuestion(q => q ? ({ ...q, question_text: e.target.value }) : q)} rows={3} style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical' as const, fontFamily: editingQuestion.question_type === 'code_output' ? 'JetBrains Mono, monospace' : 'DM Sans, sans-serif', fontSize: 13 }} placeholder="What is the output of the following code?" />
                                    </div>
                                    <div style={{ marginBottom: 12 }}>
                                      <label style={labelStyle}>Options (one per line)</label>
                                      {editingQuestion.options.map((opt, oi) => (
                                        <input key={oi} style={{ ...inputStyle, marginBottom: 6 }} value={opt} onChange={e => setEditingQuestion(q => { if (!q) return q; const opts = [...q.options]; opts[oi] = e.target.value; return { ...q, options: opts }; })} placeholder={`Option ${oi + 1}`} />
                                      ))}
                                      <button onClick={() => setEditingQuestion(q => q ? ({ ...q, options: [...q.options, ''] }) : q)} style={{ fontSize: 12, color: '#D59C10', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>+ Add option</button>
                                    </div>
                                    <div style={{ marginBottom: 12 }}>
                                      <label style={labelStyle}>Correct Answer</label>
                                      <select style={{ ...inputStyle, cursor: 'pointer' }} value={editingQuestion.correct_answer} onChange={e => setEditingQuestion(q => q ? ({ ...q, correct_answer: e.target.value }) : q)}>
                                        <option value="">Select the correct option...</option>
                                        {editingQuestion.options.filter(o => o.trim()).map((opt, oi) => (
                                          <option key={oi} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div style={{ marginBottom: 16 }}>
                                      <label style={labelStyle}>Explanation (shown after submit, optional)</label>
                                      <textarea name="question-explanation" value={editingQuestion.explanation} onChange={e => setEditingQuestion(q => q ? ({ ...q, explanation: e.target.value }) : q)} rows={2} style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical' as const, fontSize: 13 }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                      <button onClick={saveQuestion} disabled={savingQuestion} style={{ background: '#D59C10', border: 'none', borderRadius: 50, padding: '8px 22px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{savingQuestion ? 'Saving...' : editingQuestion.id ? 'Update Question' : 'Save Question'}</button>
                                      <button onClick={() => setEditingQuestion(null)} style={{ background: 'transparent', border: '1px solid #3A3F46', borderRadius: 50, padding: '8px 22px', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                                    </div>
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {quizQuestions.map((q, qi) => (
                                    <div key={q.id} style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#4E8FD4', background: 'rgba(78,143,212,0.1)', padding: '2px 8px', borderRadius: 10, flexShrink: 0, marginTop: 2 }}>Q{qi + 1}</span>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14, color: '#F5F5F5', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question_text}</div>
                                        <div style={{ fontSize: 12, color: '#6B7280' }}>{q.options.length} options, correct: <span style={{ color: '#4CAF7D' }}>{q.correct_answer}</span></div>
                                      </div>
                                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                        <button onClick={() => setEditingQuestion(q)} style={{ background: 'transparent', border: '1px solid #3A3F46', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#F5F5F5', cursor: 'pointer' }}>Edit</button>
                                        <button onClick={() => deleteQuestion(q.id!)} style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#F87171', cursor: 'pointer' }}>Delete</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* MINI_PROJECT-only: language (grading only supports these three) */}
                        {editingLesson.type === 'mini_project' && (
                          <div>
                            <label style={labelStyle}>Language (determines how tests are graded)</label>
                            <select style={{ ...inputStyle, cursor: 'pointer' }} value={editingLesson.language || 'python'}
                              onChange={e => setEditingLesson(p => p ? ({ ...p, language: e.target.value }) : p)}>
                              <option value="python">Python</option>
                              <option value="javascript">JavaScript</option>
                              <option value="typescript">TypeScript</option>
                            </select>
                          </div>
                        )}

                        {/* MINI_PROJECT / PROJECT type fields */}
                        {(editingLesson.type === 'mini_project' || editingLesson.type === 'project') && (
                          <div>
                            <div data-color-mode="dark" style={{ marginBottom: 16 }}>
                              <label style={{ ...labelStyle, marginBottom: 10 }}>Instructions (shown to students above the editor)</label>
                              <MDEditor value={editingLesson.instructions} onChange={val => setEditingLesson(p => p ? ({ ...p, instructions: val || '' }) : p)} height={200} preview="live" />
                            </div>
                            <div style={{ marginBottom: 20 }}>
                              <label style={labelStyle}>Starter Code (pre-filled in Monaco editor)</label>
                              <textarea value={editingLesson.starter_code} onChange={e => setEditingLesson(p => p ? ({ ...p, starter_code: e.target.value }) : p)} rows={8} style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical' as const, lineHeight: 1.7, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }} placeholder="# Starter code for students..." />
                            </div>
                            {!editingLesson.id ? (
                              <div style={{ padding: '14px 18px', background: 'rgba(213,156,16,0.06)', border: '1px solid rgba(213,156,16,0.2)', borderRadius: 12, fontSize: 13, color: '#D59C10' }}>
                                Save the lesson first to add test cases.
                              </div>
                            ) : (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                  <label style={labelStyle}>Test Cases ({testCases.length})</label>
                                  <button onClick={() => setEditingTestCase({ lesson_id: editingLesson.id!, order_index: testCases.length + 1, description: '', test_code: '', expected_output: '' })} style={{ background: '#D59C10', border: 'none', borderRadius: 50, padding: '6px 18px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>+ Add Test Case</button>
                                </div>
                                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12, lineHeight: 1.6 }}>
                                  Each test case appends its code to the student solution, then checks that the printed output matches expected output exactly.
                                </div>
                                {editingTestCase && (
                                  <div style={{ background: '#1A1D21', border: '1px solid #3A3F46', borderRadius: 14, padding: '1.25rem', marginBottom: 16 }}>
                                    <div style={{ marginBottom: 12 }}>
                                      <label style={labelStyle}>Description (shown to students)</label>
                                      <input style={inputStyle} value={editingTestCase.description} onChange={e => setEditingTestCase(t => t ? ({ ...t, description: e.target.value }) : t)} placeholder="e.g. add(2, 3) should return 5" />
                                    </div>
                                    <div style={{ marginBottom: 12 }}>
                                      <label style={labelStyle}>Test Code (appended to student code, should print expected output)</label>
                                      <textarea name="test-code" value={editingTestCase.test_code} onChange={e => setEditingTestCase(t => t ? ({ ...t, test_code: e.target.value }) : t)} rows={5} style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical' as const, lineHeight: 1.7, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }} placeholder={'print(add(2, 3))'} />
                                    </div>
                                    <div style={{ marginBottom: 16 }}>
                                      <label style={labelStyle}>Expected Output (exact match after trim)</label>
                                      <input style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace' }} value={editingTestCase.expected_output} onChange={e => setEditingTestCase(t => t ? ({ ...t, expected_output: e.target.value }) : t)} placeholder="5" />
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                      <button onClick={saveTestCase} disabled={savingTestCase} style={{ background: '#D59C10', border: 'none', borderRadius: 50, padding: '8px 22px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{savingTestCase ? 'Saving...' : editingTestCase.id ? 'Update Test Case' : 'Save Test Case'}</button>
                                      <button onClick={() => setEditingTestCase(null)} style={{ background: 'transparent', border: '1px solid #3A3F46', borderRadius: 50, padding: '8px 22px', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                                    </div>
                                  </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {testCases.map((tc, ti) => (
                                    <div key={tc.id} style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                      <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: '#E86F4E', background: 'rgba(232,111,78,0.1)', padding: '2px 8px', borderRadius: 10, flexShrink: 0, marginTop: 2 }}>TC{ti + 1}</span>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14, color: '#F5F5F5', marginBottom: 4 }}>{tc.description}</div>
                                        <div style={{ fontSize: 12, color: '#6B7280' }}>Expected: <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4CAF7D' }}>{tc.expected_output}</span></div>
                                      </div>
                                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                        <button onClick={() => setEditingTestCase(tc)} style={{ background: 'transparent', border: '1px solid #3A3F46', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#F5F5F5', cursor: 'pointer' }}>Edit</button>
                                        <button onClick={() => deleteTestCase(tc.id!)} style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#F87171', cursor: 'pointer' }}>Delete</button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Publish toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div onClick={() => setEditingLesson(p => p ? ({ ...p, is_published: !p.is_published }) : p)}
                            style={{
                              width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                              background: editingLesson.is_published ? '#D59C10' : '#3A3F46',
                              position: 'relative', transition: 'background 0.2s',
                            }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%', background: 'white',
                              position: 'absolute', top: 3,
                              left: editingLesson.is_published ? 23 : 3,
                              transition: 'left 0.2s',
                            }} />
                          </div>
                          <span style={{ fontSize: 13, color: '#6B7280' }}>
                            {editingLesson.is_published ? 'Published, visible to students' : 'Draft, not visible to students'}
                          </span>
                        </div>

                        {/* Requires-review toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div onClick={() => setEditingLesson(p => p ? ({ ...p, requires_review: !p.requires_review }) : p)}
                            style={{
                              width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                              background: editingLesson.requires_review ? '#4E8FD4' : '#3A3F46',
                              position: 'relative', transition: 'background 0.2s',
                            }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%', background: 'white',
                              position: 'absolute', top: 3,
                              left: editingLesson.requires_review ? 23 : 3,
                              transition: 'left 0.2s',
                            }} />
                          </div>
                          <span style={{ fontSize: 13, color: '#6B7280' }}>
                            {editingLesson.requires_review
                              ? 'Requires admin review before completion'
                              : 'Completes without review (self-marked, or auto-graded for quiz/mini project)'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button onClick={saveLesson} disabled={savingLesson} style={{
                          background: '#D59C10', border: 'none', borderRadius: 50,
                          padding: '10px 28px', fontSize: 14, fontWeight: 700,
                          color: '#1A1D21', cursor: savingLesson ? 'not-allowed' : 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}>{savingLesson ? 'Saving...' : editingLesson.id ? 'Update Lesson' : 'Create Lesson'}</button>
                        {editingLesson.id && selectedCourse?.id && (
                          <button
                            onClick={() => window.open(`/lesson/${selectedCourse.id}/${editingLesson.id}`, '_blank')}
                            style={{
                              background: 'transparent', border: '1px solid #3A3F46', borderRadius: 50,
                              padding: '10px 22px', fontSize: 14, color: '#9CA3AF',
                              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            <span>↗</span> Preview as Student
                          </button>
                        )}
                        <button onClick={() => { setShowLessonForm(false); setEditingLesson(null); }} style={{
                          background: 'transparent', border: '1px solid #3A3F46', borderRadius: 50,
                          padding: '10px 28px', fontSize: 14, color: '#6B7280',
                          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                        }}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Lesson list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {lessons.map((lesson, idx) => (
                      <div key={lesson.id} style={{
                        background: '#22262B', border: '1px solid #2A2F35',
                        borderRadius: 16, padding: '16px 20px',
                        display: 'flex', alignItems: 'center', gap: 16,
                      }}>
                        {(() => {
                          const tc: Record<string, string> = { project: '#9B6FD4', quiz: '#4E8FD4', mini_project: '#E86F4E', assessment: '#4E8FD4', lesson: '#D59C10' };
                          const c = tc[lesson.type] || '#D59C10';
                          return (
                            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${c}15`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: c }}>{idx + 1}</div>
                          );
                        })()}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5', marginBottom: 3 }}>{lesson.title}</div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {(() => {
                              const tc: Record<string, string> = { project: '#9B6FD4', quiz: '#4E8FD4', mini_project: '#E86F4E', assessment: '#4E8FD4', lesson: '#D59C10' };
                              const c = tc[lesson.type] || '#D59C10';
                              return (
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', background: `${c}15`, color: c }}>{lesson.type.replace('_', ' ').toUpperCase()}</span>
                              );
                            })()}
                            <span style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 20,
                              fontFamily: 'JetBrains Mono, monospace',
                              background: lesson.is_published ? 'rgba(76,175,125,0.1)' : 'rgba(255,255,255,0.05)',
                              color: lesson.is_published ? '#4CAF7D' : '#6B7280',
                            }}>{lesson.is_published ? 'PUBLISHED' : 'DRAFT'}</span>
                            {lesson.video_url && (
                              <span style={{
                                fontSize: 10, padding: '2px 8px', borderRadius: 20,
                                fontFamily: 'JetBrains Mono, monospace',
                                background: 'rgba(78,143,212,0.1)', color: '#4E8FD4',
                              }}>VIDEO</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button onClick={() => togglePublish(lesson)} style={{
                            background: 'transparent', border: '1px solid #3A3F46',
                            borderRadius: 20, padding: '6px 14px',
                            fontSize: 12, color: lesson.is_published ? '#F87171' : '#4CAF7D',
                            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                          }}>{lesson.is_published ? 'Unpublish' : 'Publish'}</button>
                          <button onClick={() => { setEditingLesson(lesson); setShowLessonForm(true); }} style={{
                            background: 'transparent', border: '1px solid #3A3F46',
                            borderRadius: 20, padding: '6px 14px',
                            fontSize: 12, color: '#F5F5F5', cursor: 'pointer',
                            fontFamily: 'DM Sans, sans-serif',
                          }}>Edit</button>
                          <button onClick={() => deleteLesson(lesson.id!)} style={{
                            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
                            borderRadius: 20, padding: '6px 14px',
                            fontSize: 12, color: '#F87171', cursor: 'pointer',
                            fontFamily: 'DM Sans, sans-serif',
                          }}>Delete</button>
                        </div>
                      </div>
                    ))}
                    {lessons.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
                        {'// no lessons yet. click "+ New Lesson" to add one.'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REVIEWS */}
          {/* STUDENTS */}
          {activeTab === 'analytics' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// analytics'}</div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em' }}>Analytics</h1>
              </div>
              {analytics ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {[
                      { label: 'Total Students', value: analytics.totalStudents, color: '#D59C10' },
                      { label: 'Total Enrollments', value: analytics.totalEnrollments, color: '#4E8FD4' },
                      { label: 'Certificates Issued', value: analytics.totalCerts, color: '#4CAF7D' },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, padding: '20px 24px' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{stat.label}</div>
                        <div style={{ fontSize: 36, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, padding: '20px 24px' }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Top Enrolled Courses</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {analytics.enrollmentsByCourse.map((c, i) => {
                          const tColor = tracksMap[c.track]?.color || '#D59C10';
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3A3F46', width: 16 }}>{i + 1}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                                <div style={{ height: 4, background: '#2A2F35', borderRadius: 4, marginTop: 4 }}>
                                  <div style={{ height: '100%', background: tColor, borderRadius: 4, width: `${Math.min((c.count / (analytics.enrollmentsByCourse[0]?.count || 1)) * 100, 100)}%` }} />
                                </div>
                              </div>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tColor, flexShrink: 0 }}>{c.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, padding: '20px 24px' }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#4CAF7D', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16 }}>Avg Completion by Course</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {analytics.avgCompletionByCourse.map((c, i) => {
                          const tColor = tracksMap[c.track]?.color || '#D59C10';
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3A3F46', width: 16 }}>{i + 1}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                                <div style={{ height: 4, background: '#2A2F35', borderRadius: 4, marginTop: 4 }}>
                                  <div style={{ height: '100%', background: tColor, borderRadius: 4, width: `${c.avg}%` }} />
                                </div>
                              </div>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#6B7280', flexShrink: 0 }}>{c.avg}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>Loading analytics...</div>
              )}
            </div>
          )}

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
                      const track = tracksMap[s.track];
                      return (
                        <tr key={s.id} onClick={() => openStudentDetail(s)} style={{ borderBottom: '1px solid #2A2F35', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(213,156,16,0.04)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
          {/* MY PROFILE */}
          {activeTab === 'tracks' && (
            <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, padding: '1.5rem', marginBottom: 32 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>{'// my profile'}</div>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Your name and position appear on certificates for courses you created.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Display Name</label>
                  <input style={inputStyle} value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Your full name" />
                </div>
                <div>
                  <label style={labelStyle}>Position / Title</label>
                  <input style={inputStyle} value={adminPosition} onChange={e => setAdminPosition(e.target.value)} placeholder="e.g. Research Director" />
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                Certificate preview: <span style={{ fontFamily: "'Georgia', serif", color: '#F5F5F5', fontStyle: 'italic' }}>{adminName || 'Your Name'}</span>, <span style={{ color: '#9CA3AF' }}>{adminPosition || 'Position'}</span>, Daintymindz Academy
              </div>
              <button disabled={adminProfileSaving} onClick={async () => {
                if (!adminId) return;
                setAdminProfileSaving(true);
                const { createClient } = await import('@/lib/supabase');
                const supabase = createClient();
                await supabase.from('profiles').update({ full_name: adminName.trim(), position: adminPosition.trim() }).eq('id', adminId);
                const { data: admins } = await supabase.from('profiles').select('id, full_name, position').eq('is_admin', true).order('full_name');
                if (admins) setAdminProfiles(admins);
                setAdminProfileSaving(false);
                showToast('Profile saved.');
              }} style={{ background: '#D59C10', border: 'none', borderRadius: 50, padding: '8px 22px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                {adminProfileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* TRACKS */}
          {activeTab === 'tracks' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// tracks'}</div>
                  <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em' }}>Tracks</h1>
                  <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Tracks appear in course creation, signup, and student profiles.</p>
                </div>
                <button onClick={() => setEditingTrack({ code: '', label: '', color: '#6B7280' })} style={{ background: '#D59C10', border: 'none', borderRadius: 50, padding: '10px 22px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>+ New Track</button>
              </div>

              {editingTrack && (
                <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, padding: '1.5rem', marginBottom: 24 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F5', marginBottom: 16 }}>{tracks.find(t => t.code === editingTrack.code) ? 'Edit Track' : 'New Track'}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Code (short, e.g. PM)</label>
                      <input style={inputStyle} value={editingTrack.code} onChange={e => setEditingTrack(t => t ? ({ ...t, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }) : t)} placeholder="PM" disabled={!!tracks.find(t => t.code === editingTrack.code)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Label</label>
                      <input style={inputStyle} value={editingTrack.label} onChange={e => setEditingTrack(t => t ? ({ ...t, label: e.target.value }) : t)} placeholder="Project Management" />
                    </div>
                    <div>
                      <label style={labelStyle}>Color</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" value={editingTrack.color} onChange={e => setEditingTrack(t => t ? ({ ...t, color: e.target.value }) : t)} style={{ width: 42, height: 42, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                        <input style={{ ...inputStyle, flex: 1 }} value={editingTrack.color} onChange={e => setEditingTrack(t => t ? ({ ...t, color: e.target.value }) : t)} placeholder="#6B7280" />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button onClick={saveTrack} disabled={savingTrack} style={{ background: '#D59C10', border: 'none', borderRadius: 50, padding: '8px 22px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>{savingTrack ? 'Saving...' : 'Save Track'}</button>
                    <button onClick={() => setEditingTrack(null)} style={{ background: 'transparent', border: '1px solid #3A3F46', borderRadius: 50, padding: '8px 22px', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                    <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${editingTrack.color}20`, border: `1px solid ${editingTrack.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: editingTrack.color, letterSpacing: '0.06em' }}>{editingTrack.code || 'XX'}</div>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{editingTrack.label || 'Track label'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tracks.map(t => (
                  <div key={t.code} style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: `${t.color}20`, border: `1px solid ${t.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, fontWeight: 700, color: t.color, letterSpacing: '0.06em', flexShrink: 0 }}>{t.code}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F5' }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>{t.color}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditingTrack({ ...t })} style={{ background: 'transparent', border: '1px solid #3A3F46', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#F5F5F5', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => deleteTrack(t.code)} style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 20, padding: '5px 14px', fontSize: 12, color: '#F87171', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBMISSIONS */}
          {activeTab === 'submissions' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// submissions'}</div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5' }}>Project Submissions</h1>
                <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>{pendingCount} pending review</p>
              </div>

              {submissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 0', border: '1px dashed #2A2F35', borderRadius: 20 }}>
                  <div style={{ fontSize: 13, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>No submissions yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {submissions.map(sub => (
                    <div key={sub.id} style={{
                      background: '#22262B', border: `1px solid ${sub.status === 'pending' ? 'rgba(213,156,16,0.3)' : sub.status === 'approved' ? 'rgba(76,175,125,0.25)' : 'rgba(248,113,113,0.25)'}`,
                      borderRadius: 14, padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', padding: '2px 8px', borderRadius: 20, background: sub.status === 'pending' ? 'rgba(213,156,16,0.12)' : sub.status === 'approved' ? 'rgba(76,175,125,0.12)' : 'rgba(248,113,113,0.12)', color: sub.status === 'pending' ? '#D59C10' : sub.status === 'approved' ? '#4CAF7D' : '#F87171' }}>
                            {sub.status.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 11, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>{sub.lesson_type}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F5', marginBottom: 2 }}>{sub.student_name}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>{sub.course_title} &rsaquo; {sub.lesson_title}</div>
                        <div style={{ fontSize: 11, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>
                          {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button onClick={() => { setSelectedSubmission(sub); setGradingFeedback(sub.feedback || ''); }} style={{ background: '#1A1D21', border: '1px solid #3A3F46', borderRadius: 20, padding: '7px 18px', fontSize: 13, color: '#F5F5F5', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Submission review modal */}
      {selectedSubmission && (
        <div onClick={e => { if (e.target === e.currentTarget) { setSelectedSubmission(null); setGradingFeedback(''); } }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1D21', border: '1px solid #2A2F35', borderRadius: 20, width: '100%', maxWidth: 760, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #2A2F35', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F5', marginBottom: 2 }}>{selectedSubmission.student_name}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{selectedSubmission.course_title} &rsaquo; {selectedSubmission.lesson_title}</div>
              </div>
              <button onClick={() => { setSelectedSubmission(null); setGradingFeedback(''); }} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 22, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>x</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {selectedSubmission.notes && (
                <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Student note</div>
                  <div style={{ fontSize: 13, color: '#9CA3AF' }}>{selectedSubmission.notes}</div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Submitted code</div>
                <pre style={{ background: '#0D1117', border: '1px solid #2A2F35', borderRadius: 10, padding: '14px 16px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#E5E7EB', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, maxHeight: 320, overflowY: 'auto' }}>{selectedSubmission.submitted_code}</pre>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Feedback for student</div>
                <textarea
                  name="grading-feedback"
                  value={gradingFeedback}
                  onChange={e => setGradingFeedback(e.target.value)}
                  placeholder="Write feedback (required when returning for rework)..."
                  rows={4}
                  style={{ width: '100%', background: '#22262B', border: '1px solid #3A3F46', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => gradeSubmission('approved')} disabled={grading} style={{ flex: 1, padding: '10px 0', borderRadius: 50, fontWeight: 700, fontSize: 14, border: 'none', background: grading ? '#22262B' : '#4CAF7D', color: grading ? '#6B7280' : '#1A1D21', cursor: grading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  {grading ? 'Saving...' : 'Approve'}
                </button>
                <button onClick={() => gradeSubmission('rework')} disabled={grading} style={{ flex: 1, padding: '10px 0', borderRadius: 50, fontWeight: 700, fontSize: 14, border: '1px solid rgba(248,113,113,0.4)', background: 'transparent', color: '#F87171', cursor: grading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Return for Rework
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student detail modal */}
      {selectedStudent && (
        <div onClick={() => setSelectedStudent(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#22262B', border: '1px solid #2A2F35', borderRadius: 20,
            padding: '2rem', width: '100%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.5rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#D59C10', color: '#1A1D21', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                {selectedStudent.student.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5' }}>{selectedStudent.student.full_name}</div>
                <div style={{ fontSize: 13, color: '#6B7280' }}>{selectedStudent.student.email}</div>
              </div>
              <button onClick={() => setSelectedStudent(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6B7280', fontSize: 20, cursor: 'pointer' }}>x</button>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Enrolled Courses ({selectedStudent.enrollments.length})</div>
              {selectedStudent.enrollments.length === 0 ? (
                <div style={{ fontSize: 13, color: '#3A3F46' }}>No enrollments.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedStudent.enrollments.map(e => {
                    const tColor = tracksMap[e.track]?.color || '#D59C10';
                    return (
                      <div key={e.course_id} style={{ background: '#1A1D21', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 8px', borderRadius: 20, background: `${tColor}15`, color: tColor }}>{e.track}</span>
                        <span style={{ fontSize: 13, color: '#F5F5F5', flex: 1 }}>{e.course_title}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: e.progress === 100 ? '#4CAF7D' : '#6B7280' }}>{e.progress}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#4CAF7D', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Certificates ({selectedStudent.certs.length})</div>
              {selectedStudent.certs.length === 0 ? (
                <div style={{ fontSize: 13, color: '#3A3F46' }}>No certificates yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedStudent.certs.map(c => (
                    <div key={c.cert_id} style={{ background: '#1A1D21', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#F5F5F5' }}>{c.course_title}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4CAF7D' }}>{new Date(c.issued_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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