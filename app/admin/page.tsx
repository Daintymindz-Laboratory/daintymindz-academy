'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FALLBACK_TRACKS as BASE_FALLBACK_TRACKS } from '@/lib/user-context';
import { notify } from '@/lib/notify';
import NotificationBell from '@/components/NotificationBell';
import MessageCenter from '@/components/MessageCenter';

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
  instructor_ids?: string[];
  archived_at?: string | null;
  archived_by?: string | null;
  requires_enrollment_approval: boolean;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  track: string;
  created_at: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
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
  rubric_criteria?: RubricCriterion[];
};

type RubricCriterion = {
  id: string;
  title: string;
  description: string;
  max_points: number;
};

type LessonResource = {
  id: number;
  lesson_id: number;
  title: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
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
  course_instructor: string;
  course_instructor_id: string;
  course_instructor_ids: string[];
  lesson_title: string;
  rubric_criteria: RubricCriterion[];
  rubric_scores: Record<string, number>;
  acceptance_tests_passed: number | null;
  acceptance_tests_total: number | null;
  final_score: number | null;
  grading_decision: 'pass' | 'revise' | 'not_yet' | null;
};

type EnrollmentRequest = {
  id: number;
  course_id: number;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  created_at: string;
  student_name: string;
  student_email: string;
  course_title: string;
};

const FALLBACK_TRACKS: Record<string, { label: string; color: string }> = Object.fromEntries(
  Object.entries(BASE_FALLBACK_TRACKS).map(([k, v]) => [k, { label: v.label, color: v.color }])
);

type Track = { code: string; label: string; color: string };

const EMPTY_COURSE: Course = {
  title: '', track: 'AI', level: 'Beginner',
  lessons_count: 0, duration: '', description: '', requires_enrollment_approval: false,
};

const FRESHLAB_RUBRIC: RubricCriterion[] = [
  { id: 'acceptance_tests', title: 'Acceptance tests pass', description: 'Objective score calculated from the number of acceptance tests passed.', max_points: 50 },
  { id: 'code_quality', title: 'Code quality and structure', description: 'Clear functions, meaningful names, sensible helpers, and readable orchestration.', max_points: 15 },
  { id: 'trust_mindset', title: 'Operations and trust mindset', description: 'Honest missing values, surfaced validation errors, boundary coercion, and accurate reporting.', max_points: 15 },
  { id: 'writeup', title: 'Write-up quality', description: 'Accurate, thoughtful explanation of cleaning, validation, trust, and improvements.', max_points: 15 },
  { id: 'reproducibility', title: 'Reproducibility and hygiene', description: 'Runs from a clean checkout, preserves inputs, writes expected outputs, and avoids absolute paths.', max_points: 5 },
];

const ASSESSMENT_RUBRIC: RubricCriterion[] = [
  { id: 'understanding', title: 'Understanding and accuracy', description: 'Demonstrates accurate understanding of the concepts assessed.', max_points: 40 },
  { id: 'application', title: 'Application and reasoning', description: 'Applies the concepts correctly and explains the reasoning behind the response.', max_points: 30 },
  { id: 'evidence', title: 'Evidence and completeness', description: 'Provides sufficient evidence, examples, working, or supporting detail.', max_points: 20 },
  { id: 'clarity', title: 'Clarity and presentation', description: 'Response is clear, organized, professional, and easy to follow.', max_points: 10 },
];

export default function AdminPage() {
  type Analytics = {
    totalStudents: number;
    totalEnrollments: number;
    totalCerts: number;
    enrollmentsByCourse: { title: string; track: string; count: number }[];
    avgCompletionByCourse: { title: string; track: string; avg: number }[];
    enrollmentsByTrack: { track: string; count: number; color: string }[];
    completionDistribution: { label: string; count: number; color: string }[];
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
  const [adminLoadError, setAdminLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<'courses' | 'students' | 'lessons' | 'analytics' | 'tracks' | 'submissions' | 'enrollment_requests' | 'messages'>('courses');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
  const [reviewingEnrollment, setReviewingEnrollment] = useState<number | null>(null);
  const [tracks, setTracks] = useState<Track[]>(Object.entries(FALLBACK_TRACKS).map(([code, t]) => ({ code, ...t })));
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [savingTrack, setSavingTrack] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [archivedCourses, setArchivedCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [updatingApproval, setUpdatingApproval] = useState<string | null>(null);
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
  const [lessonResources, setLessonResources] = useState<LessonResource[]>([]);
  const [uploadingResource, setUploadingResource] = useState(false);

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
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [acceptancePassed, setAcceptancePassed] = useState(0);
  const [acceptanceTotal, setAcceptanceTotal] = useState(0);
  const [gradingDecision, setGradingDecision] = useState<'pass' | 'revise' | 'not_yet'>('revise');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [savingTestCase, setSavingTestCase] = useState(false);

  type EnrollmentRow = { user_id: string; student_name: string; enrolled_at: string; progress: number };
  const [enrollmentsCourse, setEnrollmentsCourse] = useState<Course | null>(null);
  const [enrollmentsData, setEnrollmentsData] = useState<EnrollmentRow[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

  const viewEnrollments = async (course: Course) => {
    setEnrollmentsCourse(course);
    setEnrollmentsLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const [{ data: enrollData }, { data: progressData }, { data: profilesData }] = await Promise.all([
        supabase.from('enrollments').select('user_id, enrolled_at').eq('course_id', course.id),
        supabase.from('progress').select('user_id, percentage').eq('course_id', course.id),
        supabase.from('profiles').select('id, full_name'),
      ]);
      const nameMap: Record<string, string> = Object.fromEntries((profilesData || []).map((p: any) => [p.id, p.full_name || 'Unknown']));
      const progressMap: Record<string, number> = Object.fromEntries((progressData || []).map((p: any) => [p.user_id, p.percentage || 0]));
      setEnrollmentsData((enrollData || []).map((e: any) => ({
        user_id: e.user_id,
        student_name: nameMap[e.user_id] || 'Unknown',
        enrolled_at: e.enrolled_at,
        progress: progressMap[e.user_id] || 0,
      })).sort((a: EnrollmentRow, b: EnrollmentRow) => b.progress - a.progress));
    } catch {
      showToast('Could not load enrollments.');
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) { window.location.href = '/signin'; return; }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;
        if (!profile?.is_admin) { window.location.href = '/dashboard'; return; }

        setAdminName(profile.full_name);
        setAdminId(user.id);
        setAdminPosition(profile.position || '');

        // Authorization is complete, so render the admin shell immediately.
        // Optional panel queries must not be able to leave the whole page stuck.
        setLoading(false);

        const results = await Promise.allSettled([
          loadTracks(supabase),
          loadCourses(supabase),
          loadStudents(supabase),
          loadAnalytics(supabase),
          loadSubmissions(supabase),
          supabase.from('profiles').select('id, full_name, position').eq('is_admin', true).order('full_name'),
        ]);

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Admin panel request ${index + 1} failed:`, result.reason);
          }
        });

        const adminsResult = results[5];
        if (adminsResult.status === 'fulfilled' && adminsResult.value.data) {
          setAdminProfiles(adminsResult.value.data);
        }
      } catch (error) {
        console.error('Admin initialization failed:', error);
        setAdminLoadError(error instanceof Error ? error.message : 'Could not load the admin account.');
        setLoading(false);
      }
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
      .from('lesson_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('loadSubmissions error:', error); return; }
    if (!data || data.length === 0) { setSubmissions([]); setPendingCount(0); return; }

    const lessonIds = [...new Set(data.map((s: any) => s.lesson_id as number))];

    const { data: lessonsData } = await supabase.from('lessons').select('*').in('id', lessonIds);
    const courseIds = [...new Set((lessonsData || []).map((lesson: any) => lesson.course_id as number))];
    const [{ data: profilesData }, { data: coursesData }] = await Promise.all([
      supabase.from('profiles').select('id, full_name'),
      supabase.from('courses').select('id, title, created_by, instructor_ids').in('id', courseIds),
    ]);

    const profileMap: Record<string, string> = Object.fromEntries((profilesData || []).map((p: any) => [p.id, p.full_name || 'Unknown']));
    const courseMap: Record<number, { title: string; instructor: string; instructorId: string; instructorIds: string[] }> = Object.fromEntries(
      (coursesData || []).map((c: any) => {
        const ids: string[] = c.instructor_ids?.length ? c.instructor_ids : [c.created_by].filter(Boolean);
        return [c.id, { title: c.title, instructor: ids.map((id: string) => profileMap[id]).filter(Boolean).join(', ') || 'Unknown', instructorId: c.created_by || '', instructorIds: (c.instructor_ids || []) as string[] }];
      })
    );
    const lessonMap: Record<number, { title: string; courseId: number; type: string; rubric: RubricCriterion[] }> = Object.fromEntries(
      (lessonsData || []).map((l: any) => [l.id, { title: l.title, courseId: l.course_id, type: l.type, rubric: l.rubric_criteria || [] }])
    );

    const mapped = data.map((s: any) => ({
      ...s,
      course_id: lessonMap[s.lesson_id]?.courseId,
      lesson_type: lessonMap[s.lesson_id]?.type || 'project',
      submitted_code: s.submission_url,
      notes: s.note,
      submitted_at: s.created_at,
      status: s.status === 'rejected' ? 'rework' : s.status,
      student_name: profileMap[s.user_id] || 'Unknown',
      course_title: courseMap[lessonMap[s.lesson_id]?.courseId]?.title || '',
      course_instructor: courseMap[lessonMap[s.lesson_id]?.courseId]?.instructor || '',
      course_instructor_id: courseMap[lessonMap[s.lesson_id]?.courseId]?.instructorId || '',
      course_instructor_ids: courseMap[lessonMap[s.lesson_id]?.courseId]?.instructorIds || [],
      lesson_title: lessonMap[s.lesson_id]?.title || '',
      rubric_criteria: lessonMap[s.lesson_id]?.rubric || [],
      rubric_scores: s.rubric_scores || {},
      acceptance_tests_passed: s.acceptance_tests_passed,
      acceptance_tests_total: s.acceptance_tests_total,
      final_score: s.final_score,
      grading_decision: s.grading_decision,
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
    const databaseStatus = status === 'rework' ? 'rejected' : status;
    const scoredRubric = { ...rubricScores };
    const acceptanceCriterion = selectedSubmission.rubric_criteria.find(criterion => criterion.id === 'acceptance_tests');
    if (acceptanceCriterion && acceptanceTotal > 0) {
      scoredRubric.acceptance_tests = Math.round(acceptanceCriterion.max_points * Math.min(acceptancePassed, acceptanceTotal) / acceptanceTotal);
    }
    const finalScore = selectedSubmission.rubric_criteria.reduce(
      (total, criterion) => total + Math.min(Number(scoredRubric[criterion.id]) || 0, criterion.max_points),
      0,
    );
    const decision = status === 'approved' ? 'pass' : gradingDecision;
    const { error } = await supabase.from('lesson_submissions')
      .update({
        status: databaseStatus,
        feedback: gradingFeedback.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        acceptance_tests_passed: acceptanceTotal > 0 ? acceptancePassed : null,
        acceptance_tests_total: acceptanceTotal > 0 ? acceptanceTotal : null,
        rubric_scores: scoredRubric,
        final_score: selectedSubmission.rubric_criteria.length ? finalScore : null,
        grading_decision: decision,
      })
      .eq('id', selectedSubmission.id);
    if (error) { showToast(`Error: ${error.message}`); setGrading(false); return; }
    if (status === 'approved') {
      const { data: progRow } = await supabase
        .from('progress').select('completed_lessons, percentage')
        .eq('user_id', selectedSubmission.user_id)
        .eq('course_id', selectedSubmission.course_id)
        .maybeSingle();
      const existing: number[] = (progRow?.completed_lessons || []).map(Number);
      const lessonIdNum = Number(selectedSubmission.lesson_id);
      const newCompleted = existing.includes(lessonIdNum) ? existing : [...existing, lessonIdNum];
      const { data: courseLessons } = await supabase
        .from('lessons').select('id').eq('course_id', selectedSubmission.course_id).eq('is_published', true);
      const totalLessons = (courseLessons || []).length || 1;
      const percentage = Math.round((newCompleted.length / totalLessons) * 100);
      if (progRow) {
        await supabase.from('progress').update({ completed_lessons: newCompleted, percentage, last_accessed: new Date().toISOString() })
          .eq('user_id', selectedSubmission.user_id).eq('course_id', selectedSubmission.course_id);
      } else {
        await supabase.from('progress').insert({ user_id: selectedSubmission.user_id, course_id: selectedSubmission.course_id, completed_lessons: newCompleted, percentage });
      }
    }
    if (status === 'approved') {
      notify({ userId: selectedSubmission.user_id, type: 'submission_approved', title: 'Submission approved!', message: `Your project for "${selectedSubmission.lesson_title}" has been approved. Great work!`, link: `/lesson/${selectedSubmission.course_id}/${selectedSubmission.lesson_id}` });
      notify({ courseAdmins: true, courseId: selectedSubmission.course_id, excludeUserId: selectedSubmission.user_id, type: 'submission_approved', title: 'Submission approved', message: `${selectedSubmission.student_name}'s submission for "${selectedSubmission.lesson_title}" was approved.`, link: '/admin' });
    } else {
      notify({ userId: selectedSubmission.user_id, type: 'submission_rework', title: 'Submission needs rework', message: `Your project for "${selectedSubmission.lesson_title}" needs some changes. Feedback: ${gradingFeedback.trim()}`, link: `/lesson/${selectedSubmission.course_id}/${selectedSubmission.lesson_id}` });
      notify({ courseAdmins: true, courseId: selectedSubmission.course_id, excludeUserId: selectedSubmission.user_id, type: 'submission_rework', title: 'Submission returned for rework', message: `${selectedSubmission.student_name}'s submission for "${selectedSubmission.lesson_title}" was returned for changes.`, link: '/admin' });
    }
    await loadSubmissions(supabase);
    setSelectedSubmission(null);
    setGradingFeedback('');
    setGrading(false);
    showToast(status === 'approved' ? 'Submission approved!' : 'Returned for rework.');
  };

  const loadEnrollmentRequests = async (supabase: any) => {
    const { data, error } = await supabase.from('course_enrollment_requests').select('*').order('created_at', { ascending: false });
    if (error) { console.error('loadEnrollmentRequests error:', error); return; }
    const userIds = [...new Set((data || []).map((request: any) => request.user_id))];
    const courseIds = [...new Set((data || []).map((request: any) => request.course_id))];
    const [{ data: profiles }, { data: requestCourses }] = await Promise.all([
      userIds.length ? supabase.from('profiles').select('id,full_name,email').in('id', userIds) : Promise.resolve({ data: [] }),
      courseIds.length ? supabase.from('courses').select('id,title').in('id', courseIds) : Promise.resolve({ data: [] }),
    ]);
    const profileMap = Object.fromEntries((profiles || []).map((profile: any) => [profile.id, profile]));
    const courseMap = Object.fromEntries((requestCourses || []).map((course: any) => [course.id, course.title]));
    setEnrollmentRequests((data || []).map((request: any) => ({
      ...request,
      student_name: profileMap[request.user_id]?.full_name || 'Student',
      student_email: profileMap[request.user_id]?.email || '',
      course_title: courseMap[request.course_id] || 'Course',
    })));
  };

  useEffect(() => {
    if (activeTab !== 'enrollment_requests' || !adminId) return;
    void (async () => {
      const { createClient } = await import('@/lib/supabase');
      await loadEnrollmentRequests(createClient());
    })();
  }, [activeTab, adminId]);

  const reviewEnrollmentRequest = async (request: EnrollmentRequest, status: 'approved' | 'rejected') => {
    setReviewingEnrollment(request.id);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { error } = await supabase.rpc('review_course_enrollment_request', { p_request_id: request.id, p_status: status });
    if (error) showToast(`Could not review request: ${error.message}`);
    else {
      await loadEnrollmentRequests(supabase);
      showToast(`${request.student_name}'s course access was ${status}.`);
      void notify({ userId: request.user_id, emailOnly: true, type: `course_access_${status}`, title: status === 'approved' ? 'Course access approved' : 'Course access request declined', message: status === 'approved' ? `Your request to join "${request.course_title}" was approved.` : `Your request to join "${request.course_title}" was declined.`, link: status === 'approved' ? '/my-courses' : '/catalog' });
    }
    setReviewingEnrollment(null);
  };

  const openSubmissionReview = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradingFeedback(submission.feedback || '');
    setRubricScores(submission.rubric_scores || {});
    setAcceptancePassed(submission.acceptance_tests_passed || 0);
    setAcceptanceTotal(submission.acceptance_tests_total || (submission.rubric_criteria.some(criterion => criterion.id === 'acceptance_tests') ? 11 : 0));
    setGradingDecision(submission.grading_decision === 'not_yet' ? 'not_yet' : 'revise');
  };

  const loadCourses = async (supabase: any) => {
    const { data } = await supabase.from('courses').select('*').order('id');
    if (data) {
      setCourses(data.filter((course: Course) => !course.archived_at));
      setArchivedCourses(data.filter((course: Course) => !!course.archived_at));
    }
  };

  const loadStudents = async (supabase: any) => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setStudents(data);
  };

  const setAccountApproval = async (student: Profile, status: 'approved' | 'rejected') => {
    setUpdatingApproval(student.id);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { error } = await supabase.rpc('set_profile_approval', { p_user_id: student.id, p_status: status });
    if (error) showToast(`Could not update access: ${error.message}`);
    else {
      await loadStudents(supabase);
      showToast(`${student.full_name}'s access was ${status}.`);
      void notify({ userId: student.id, emailOnly: true, type: `account_${status}`, title: status === 'approved' ? 'Academy access approved' : 'Academy access request declined', message: status === 'approved' ? 'Your Daintymindz Academy account has been approved.' : 'Your Daintymindz Academy access request was declined.', link: status === 'approved' ? '/dashboard' : '/pending-approval' });
    }
    setUpdatingApproval(null);
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

    const trackEnrollCount: Record<string, number> = {};
    (enrollData || []).forEach((e: any) => {
      const track = courseMap[e.course_id]?.track || 'other';
      trackEnrollCount[track] = (trackEnrollCount[track] || 0) + 1;
    });
    const enrollmentsByTrack = Object.entries(trackEnrollCount)
      .map(([track, count]) => ({ track, count, color: FALLBACK_TRACKS[track as keyof typeof FALLBACK_TRACKS]?.color || '#6B7280' }))
      .sort((a, b) => b.count - a.count);

    const progBuckets = { 'Not Started': 0, 'In Progress': 0, 'Completed': 0 };
    (progressData || []).forEach((p: any) => {
      const pct = p.percentage || 0;
      if (pct === 0) progBuckets['Not Started']++;
      else if (pct >= 100) progBuckets['Completed']++;
      else progBuckets['In Progress']++;
    });
    const completionDistribution = [
      { label: 'Not Started', count: progBuckets['Not Started'], color: '#3A3F46' },
      { label: 'In Progress', count: progBuckets['In Progress'], color: '#4E8FD4' },
      { label: 'Completed', count: progBuckets['Completed'], color: '#4CAF7D' },
    ];

    setAnalytics({
      totalStudents: (await supabase.from('profiles').select('id', { count: 'exact', head: true })).count || 0,
      totalEnrollments: (enrollData || []).length,
      totalCerts: (certsData || []).length,
      enrollmentsByCourse,
      avgCompletionByCourse,
      enrollmentsByTrack,
      completionDistribution,
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
    if (!editingLesson?.id) { setQuizQuestions([]); setTestCases([]); setLessonResources([]); return; }
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
      const { data: resources } = await supabase
        .from('lesson_resources')
        .select('*')
        .eq('lesson_id', editingLesson.id)
        .order('created_at');
      setLessonResources(resources || []);
    };
    load();
  }, [editingLesson?.id, editingLesson?.type]);

  const uploadLessonResource = async (file: File) => {
    if (!editingLesson?.id || !adminId) {
      showToast('Save the lesson before uploading resources.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showToast('Files must be 50 MB or smaller.');
      return;
    }
    setUploadingResource(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${editingLesson.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('lesson-resources').upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
    });
    if (uploadError) {
      setUploadingResource(false);
      showToast(uploadError.message);
      return;
    }
    const { data, error } = await supabase.from('lesson_resources').insert({
      lesson_id: editingLesson.id,
      title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size: file.size,
      uploaded_by: adminId,
    }).select().single();
    if (error) {
      await supabase.storage.from('lesson-resources').remove([storagePath]);
      showToast(error.message);
    } else {
      setLessonResources(resources => [...resources, data]);
      showToast('Student download uploaded.');
    }
    setUploadingResource(false);
  };

  const deleteLessonResource = async (resource: LessonResource) => {
    if (!window.confirm(`Remove "${resource.file_name}" from this lesson?`)) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { error } = await supabase.storage.from('lesson-resources').remove([resource.storage_path]);
    if (error) { showToast(error.message); return; }
    const { error: rowError } = await supabase.from('lesson_resources').delete().eq('id', resource.id);
    if (rowError) { showToast(rowError.message); return; }
    setLessonResources(resources => resources.filter(item => item.id !== resource.id));
    showToast('Student download removed.');
  };

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
    const instructorIds = editingCourse.instructor_ids?.length
      ? editingCourse.instructor_ids
      : [editingCourse.created_by || adminId].filter(Boolean);
    const primaryInstructorId = instructorIds[0] || adminId;
    if (editingCourse.id) {
      await supabase.from('courses').update({
        title: editingCourse.title,
        track: editingCourse.track,
        level: editingCourse.level,
        lessons_count: editingCourse.lessons_count,
        duration: editingCourse.duration,
        description: editingCourse.description,
        created_by: primaryInstructorId,
        instructor_ids: instructorIds,
        requires_enrollment_approval: editingCourse.requires_enrollment_approval,
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
        created_by: primaryInstructorId,
        instructor_ids: instructorIds,
        requires_enrollment_approval: editingCourse.requires_enrollment_approval,
      });
      showToast('Course created!');
    }
    await loadCourses(supabase);
    setShowForm(false);
    setEditingCourse(EMPTY_COURSE);
    setSaving(false);
  };

  const archiveCourse = async (id: number) => {
    if (!confirm('Archive this course? Students will no longer see or open it, and you can restore it later.')) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { error } = await supabase.from('courses').update({
      archived_at: new Date().toISOString(),
      archived_by: adminId,
    }).eq('id', id);
    if (error) { showToast(`Could not archive course: ${error.message}`); return; }
    await loadCourses(supabase);
    showToast('Course moved to archive.');
  };

  const restoreCourse = async (id: number) => {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { error } = await supabase.from('courses').update({
      archived_at: null,
      archived_by: null,
    }).eq('id', id);
    if (error) { showToast(`Could not restore course: ${error.message}`); return; }
    await loadCourses(supabase);
    showToast('Course restored.');
  };

  const deleteCourse = async (id: number, title: string) => {
    if (!confirm(`Permanently delete "${title}"? This cannot be undone. All lessons, enrollments, and progress for this course will be removed.`)) return;
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) { showToast(`Could not delete course: ${error.message}`); return; }
    await loadCourses(supabase);
    showToast('Course permanently deleted.');
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
    setShowLessonForm(false);
    setEditingLesson(null);
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
        rubric_criteria: editingLesson.rubric_criteria || [],
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
        rubric_criteria: editingLesson.rubric_criteria || [],
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

  if (adminLoadError) return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#22262B', border: '1px solid #3A3F46', borderRadius: 16, padding: 28, textAlign: 'center' }}>
        <div style={{ color: '#F87171', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Could not load the admin panel</div>
        <div style={{ color: '#9CA3AF', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{adminLoadError}</div>
        <button onClick={() => window.location.reload()} style={{
          background: '#D59C10', border: 'none', borderRadius: 50,
          padding: '10px 24px', fontSize: 14, fontWeight: 700,
          color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}>Try again</button>
      </div>
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
        {adminId && <NotificationBell userId={adminId} />}
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
              { id: 'enrollment_requests', label: 'Course Access', icon: '🔐' },
              { id: 'submissions', label: 'Submissions', icon: '◧' },
              { id: 'messages', label: 'Messages', icon: '✉' },
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
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Course Instructors (certificate signatories)</label>
                      <div style={{ ...inputStyle, height: 'auto', minHeight: 46, padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                        {adminProfiles.map(a => {
                          const selectedIds = editingCourse.instructor_ids?.length
                            ? editingCourse.instructor_ids
                            : [editingCourse.created_by || adminId].filter(Boolean);
                          const checked = selectedIds.includes(a.id);
                          return (
                            <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 9, color: checked ? '#F5F5F5' : '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setEditingCourse(p => {
                                  const current = p.instructor_ids?.length
                                    ? p.instructor_ids
                                    : [p.created_by || adminId].filter(Boolean);
                                  const instructor_ids = current.includes(a.id)
                                    ? current.filter(id => id !== a.id)
                                    : [...current, a.id];
                                  return { ...p, instructor_ids, created_by: instructor_ids[0] || null };
                                })}
                                style={{ accentColor: '#D59C10' }}
                              />
                              <span>{a.full_name}{a.position ? ` (${a.position})` : ''}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, color: '#6B7280' }}>Each selected instructor will sign the certificate. The first selected instructor remains the primary course owner.</div>
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
                    <div style={{ gridColumn: '1 / -1', padding: '14px 16px', border: '1px solid #3A3F46', borderRadius: 12, background: '#1A1D21' }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editingCourse.requires_enrollment_approval} onChange={event => setEditingCourse(course => ({ ...course, requires_enrollment_approval: event.target.checked }))} style={{ marginTop: 3, accentColor: '#D59C10' }} />
                        <span>
                          <span style={{ display: 'block', color: '#F5F5F5', fontSize: 13, fontWeight: 700 }}>Require approval before enrollment</span>
                          <span style={{ display: 'block', color: '#6B7280', fontSize: 11, marginTop: 3 }}>Students must request access. Assigned course instructors approve or decline the request before the course can be opened.</span>
                        </span>
                      </label>
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
                  const instructorIds = course.instructor_ids?.length
                    ? course.instructor_ids
                    : [course.created_by].filter(Boolean) as string[];
                  const instructorNames = instructorIds
                    .map(id => adminProfiles.find(profile => profile.id === id)?.full_name)
                    .filter(Boolean)
                    .join(', ');
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
                        {instructorNames && (
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Instructors: {instructorNames}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => viewEnrollments(course)} style={{
                          background: 'rgba(78,143,212,0.08)', border: '1px solid rgba(78,143,212,0.2)',
                          borderRadius: 20, padding: '6px 16px',
                          fontSize: 12, color: '#4E8FD4', cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}>Enrollments</button>
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
                        <button onClick={() => archiveCourse(course.id!)} style={{
                          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
                          borderRadius: 20, padding: '6px 16px',
                          fontSize: 12, color: '#F87171', cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}>Archive</button>
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

              {archivedCourses.length > 0 && (
                <div style={{ marginTop: '2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B7280', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Archived courses</div>
                    <span style={{ background: '#2A2F35', color: '#9CA3AF', borderRadius: 20, padding: '1px 8px', fontSize: 10 }}>{archivedCourses.length}</span>
                  </div>
                  <div style={{ background: '#1A1D21', border: '1px dashed #3A3F46', borderRadius: 16, overflow: 'hidden' }}>
                    {archivedCourses.map((course, index) => (
                      <div key={course.id} style={{
                        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                        borderBottom: index < archivedCourses.length - 1 ? '1px solid #2A2F35' : 'none',
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 600 }}>{course.title}</div>
                          <div style={{ color: '#4B5563', fontSize: 11, marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
                            Archived {course.archived_at ? new Date(course.archived_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => restoreCourse(course.id!)} style={{
                            background: 'rgba(76,175,125,0.08)', border: '1px solid rgba(76,175,125,0.25)',
                            borderRadius: 20, padding: '6px 16px', color: '#4CAF7D',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                          }}>Restore</button>
                          <button onClick={() => deleteCourse(course.id!, course.title)} style={{
                            background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
                            borderRadius: 20, padding: '6px 16px', color: '#F87171',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                          }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LESSON BUILDER */}
          {activeTab === 'lessons' && (
            <div>
              {!selectedCourse ? (
                <div>
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// lesson builder'}</div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em' }}>Select a course</h1>
                    <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Choose the course whose lessons you want to create or manage.</p>
                  </div>

                  {courses.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                      {courses.map(course => {
                        const track = tracksMap[course.track];
                        return (
                          <button
                            key={course.id}
                            onClick={() => openCourse(course)}
                            style={{
                              background: '#22262B', border: '1px solid #2A2F35',
                              borderRadius: 16, padding: '18px 20px', textAlign: 'left',
                              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', color: '#F5F5F5',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                              <span style={{
                                minWidth: 38, height: 38, padding: '0 8px', borderRadius: 10,
                                background: `${track?.color || '#D59C10'}15`,
                                border: `1px solid ${track?.color || '#D59C10'}30`,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700,
                                color: track?.color || '#D59C10',
                              }}>{course.track}</span>
                              <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>{course.title}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#6B7280' }}>
                              {course.lessons_count || 0} lessons · {course.level}{course.duration ? ` · ${course.duration}` : ''}
                            </div>
                            <div style={{ fontSize: 12, color: '#D59C10', marginTop: 14, fontWeight: 600 }}>Open lesson builder →</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '5rem 1rem', background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16 }}>
                      <div style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>There are no courses available yet.</div>
                      <button onClick={() => setActiveTab('courses')} style={{
                        background: '#D59C10', border: 'none', borderRadius: 50,
                        padding: '10px 24px', fontSize: 14, fontWeight: 700,
                        color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                      }}>Create a course</button>
                    </div>
                  )}
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
                      <div style={{ marginTop: 12, minWidth: 280 }}>
                        <label style={{ ...labelStyle, marginBottom: 5 }}>Course</label>
                        <select
                          aria-label="Select course for lesson builder"
                          style={{ ...inputStyle, cursor: 'pointer', height: 38 }}
                          value={selectedCourse.id}
                          onChange={event => {
                            const course = courses.find(item => item.id === Number(event.target.value));
                            if (course) openCourse(course);
                          }}
                        >
                          {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                          ))}
                        </select>
                      </div>
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
                        rubric_criteria: [],
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
                              <option value="discussion">Discussion Prompt (response required)</option>
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

                        {/* ASSESSMENT / DISCUSSION type fields */}
                        {(editingLesson.type === 'assessment' || editingLesson.type === 'discussion') && (
                          <div data-color-mode="dark">
                            <label style={{ ...labelStyle, marginBottom: 10 }}>{editingLesson.type === 'discussion' ? 'Discussion Prompt' : 'Assessment Content'}, Markdown supported</label>
                            {editingLesson.type === 'discussion' && <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>Learners must post a response before the Next button becomes available.</div>}
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

                        {(editingLesson.type === 'mini_project' || editingLesson.type === 'project' || editingLesson.type === 'assessment') && editingLesson.requires_review && (
                          <div style={{ background: '#1A1D21', border: '1px solid #3A3F46', borderRadius: 14, padding: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                              <div>
                                <label style={{ ...labelStyle, marginBottom: 3 }}>Grading Rubric</label>
                                <div style={{ fontSize: 11, color: '#6B7280' }}>
                                  Total: {(editingLesson.rubric_criteria || []).reduce((sum, criterion) => sum + (Number(criterion.max_points) || 0), 0)} points
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" onClick={() => setEditingLesson(lesson => lesson ? ({
                                  ...lesson,
                                  rubric_criteria: (lesson.type === 'assessment' ? ASSESSMENT_RUBRIC : FRESHLAB_RUBRIC).map(criterion => ({ ...criterion })),
                                }) : lesson)} style={{ background: 'rgba(78,143,212,0.1)', border: '1px solid rgba(78,143,212,0.3)', borderRadius: 20, padding: '6px 14px', color: '#4E8FD4', fontSize: 12, cursor: 'pointer' }}>Load rubric</button>
                                <button type="button" onClick={() => setEditingLesson(lesson => lesson ? ({
                                  ...lesson,
                                  rubric_criteria: [...(lesson.rubric_criteria || []), {
                                    id: `criterion_${Date.now()}`,
                                    title: '',
                                    description: '',
                                    max_points: 10,
                                  }],
                                }) : lesson)} style={{ background: '#D59C10', border: 'none', borderRadius: 20, padding: '6px 14px', color: '#1A1D21', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ Criterion</button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {(editingLesson.rubric_criteria || []).map((criterion, index) => (
                                <div key={criterion.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 90px auto', gap: 8, alignItems: 'start' }}>
                                  <input style={inputStyle} value={criterion.title} placeholder="Criterion title" onChange={event => setEditingLesson(lesson => {
                                    if (!lesson) return lesson;
                                    const rubric = [...(lesson.rubric_criteria || [])];
                                    rubric[index] = { ...rubric[index], title: event.target.value };
                                    return { ...lesson, rubric_criteria: rubric };
                                  })} />
                                  <input style={inputStyle} value={criterion.description} placeholder="What the reviewer should assess" onChange={event => setEditingLesson(lesson => {
                                    if (!lesson) return lesson;
                                    const rubric = [...(lesson.rubric_criteria || [])];
                                    rubric[index] = { ...rubric[index], description: event.target.value };
                                    return { ...lesson, rubric_criteria: rubric };
                                  })} />
                                  <input style={inputStyle} type="number" min={0} value={criterion.max_points} onChange={event => setEditingLesson(lesson => {
                                    if (!lesson) return lesson;
                                    const rubric = [...(lesson.rubric_criteria || [])];
                                    rubric[index] = { ...rubric[index], max_points: Math.max(0, Number(event.target.value) || 0) };
                                    return { ...lesson, rubric_criteria: rubric };
                                  })} />
                                  <button type="button" onClick={() => setEditingLesson(lesson => lesson ? ({ ...lesson, rubric_criteria: (lesson.rubric_criteria || []).filter((_, criterionIndex) => criterionIndex !== index) }) : lesson)} style={{ height: 42, background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', borderRadius: 10, padding: '0 12px', cursor: 'pointer' }}>Remove</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ background: '#1A1D21', border: '1px solid #3A3F46', borderRadius: 14, padding: '1.25rem' }}>
                          <label style={{ ...labelStyle, marginBottom: 4 }}>Student Downloads</label>
                          <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 14 }}>
                            Attach starter ZIPs, briefs, templates, datasets, or other files students need. Keep answer keys and instructor references private.
                          </div>
                          {!editingLesson.id ? (
                            <div style={{ color: '#9CA3AF', fontSize: 12 }}>Create the lesson first, then reopen it to upload files.</div>
                          ) : (
                            <>
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: uploadingResource ? '#3A3F46' : '#D59C10', color: '#1A1D21', borderRadius: 20, padding: '7px 16px', fontWeight: 700, fontSize: 12, cursor: uploadingResource ? 'not-allowed' : 'pointer' }}>
                                {uploadingResource ? 'Uploading…' : '+ Upload file'}
                                <input
                                  type="file"
                                  disabled={uploadingResource}
                                  accept=".zip,.md,.pdf,.py,.txt,.csv,.json,.jsonl,.html"
                                  style={{ display: 'none' }}
                                  onChange={event => {
                                    const file = event.target.files?.[0];
                                    if (file) uploadLessonResource(file);
                                    event.currentTarget.value = '';
                                  }}
                                />
                              </label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: lessonResources.length ? 12 : 0 }}>
                                {lessonResources.map(resource => (
                                  <div key={resource.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#22262B', borderRadius: 10, padding: '10px 12px' }}>
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ color: '#F5F5F5', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{resource.title}</div>
                                      <div style={{ color: '#6B7280', fontSize: 11 }}>{resource.file_name}{resource.file_size ? ` · ${(resource.file_size / 1024 / 1024).toFixed(2)} MB` : ''}</div>
                                    </div>
                                    <button type="button" onClick={() => deleteLessonResource(resource)} style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', borderRadius: 20, padding: '5px 12px', cursor: 'pointer' }}>Remove</button>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

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
                        {editingLesson.type !== 'discussion' && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                        </div>}
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
                          const tc: Record<string, string> = { project: '#9B6FD4', quiz: '#4E8FD4', mini_project: '#E86F4E', assessment: '#4E8FD4', discussion: '#42B8A6', lesson: '#D59C10' };
                          const c = tc[lesson.type] || '#D59C10';
                          return (
                            <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${c}15`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: c }}>{idx + 1}</div>
                          );
                        })()}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5', marginBottom: 3 }}>{lesson.title}</div>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            {(() => {
                              const tc: Record<string, string> = { project: '#9B6FD4', quiz: '#4E8FD4', mini_project: '#E86F4E', assessment: '#4E8FD4', discussion: '#42B8A6', lesson: '#D59C10' };
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
              {analytics ? (() => {
                const barMax = analytics.enrollmentsByCourse[0]?.count || 1;
                const chartH = 100;
                const barW = 28;
                const barGap = 10;
                const barCount = analytics.enrollmentsByCourse.length;
                const svgW = barCount * (barW + barGap) + barGap;

                const donutTotal = analytics.enrollmentsByTrack.reduce((s, t) => s + t.count, 0) || 1;
                const donutR = 54;
                const donutCx = 80;
                const donutCy = 80;
                const donutThick = 22;
                let donutAngle = -Math.PI / 2;
                const donutSlices = analytics.enrollmentsByTrack.map(t => {
                  const angle = (t.count / donutTotal) * 2 * Math.PI;
                  const x1 = donutCx + donutR * Math.cos(donutAngle);
                  const y1 = donutCy + donutR * Math.sin(donutAngle);
                  donutAngle += angle;
                  const x2 = donutCx + donutR * Math.cos(donutAngle);
                  const y2 = donutCy + donutR * Math.sin(donutAngle);
                  const large = angle > Math.PI ? 1 : 0;
                  return { ...t, x1, y1, x2, y2, large, angle };
                });

                const distTotal = analytics.completionDistribution.reduce((s, d) => s + d.count, 0) || 1;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

                    {/* Bar chart: top enrolled courses */}
                    <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, padding: '20px 24px' }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Enrollments by Course</div>
                      <svg viewBox={`0 0 ${Math.max(svgW, 360)} ${chartH + 28}`} width={Math.max(svgW, 360)} height={chartH + 28} style={{ display: 'block', maxWidth: '100%', height: 'auto' }}>
                        {analytics.enrollmentsByCourse.map((c, i) => {
                          const tColor = tracksMap[c.track]?.color || '#D59C10';
                          const barH = Math.max(4, Math.round((c.count / barMax) * chartH));
                          const x = barGap + i * (barW + barGap);
                          const y = chartH - barH;
                          const cx = x + barW / 2;
                          return (
                            <g key={i}>
                              <rect x={x} y={y} width={barW} height={barH} fill={tColor} rx={6} opacity={0.85} />
                              <text x={cx} y={y - 7} textAnchor="middle" fill={tColor} fontSize={12} fontFamily="JetBrains Mono, monospace" fontWeight={700}>{c.count}</text>
                              <text x={cx} y={chartH + 16} textAnchor="middle" fill="#6B7280" fontSize={11} fontFamily="JetBrains Mono, monospace" fontWeight={700}>{i + 1}</text>
                            </g>
                          );
                        })}
                        <line x1={0} y1={chartH} x2={Math.max(svgW, 360)} y2={chartH} stroke="#2A2F35" strokeWidth={1} />
                      </svg>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16, borderTop: '1px solid #2A2F35', paddingTop: 14 }}>
                        {analytics.enrollmentsByCourse.map((c, i) => {
                          const tColor = tracksMap[c.track]?.color || '#D59C10';
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B7280', width: 14, flexShrink: 0 }}>{i + 1}</span>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: tColor, flexShrink: 0 }} />
                              <span style={{ fontSize: 13, color: '#D1D5DB', flex: 1 }}>{c.title}</span>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tColor }}>{c.count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {/* Donut chart: enrollments by track */}
                      <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, padding: '20px 24px' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#4E8FD4', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Enrollments by Track</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                          <svg width={160} height={160} style={{ flexShrink: 0 }}>
                            {donutSlices.length === 0 || donutTotal === 0 ? (
                              <circle cx={donutCx} cy={donutCy} r={donutR} fill="none" stroke="#2A2F35" strokeWidth={donutThick} />
                            ) : donutSlices.length === 1 ? (
                              <circle cx={donutCx} cy={donutCy} r={donutR} fill="none" stroke={donutSlices[0].color} strokeWidth={donutThick} opacity={0.85} />
                            ) : donutSlices.map((s, i) => (
                              <path
                                key={i}
                                d={`M ${s.x1} ${s.y1} A ${donutR} ${donutR} 0 ${s.large} 1 ${s.x2} ${s.y2}`}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={donutThick}
                                opacity={0.85}
                              />
                            ))}
                            <text x={donutCx} y={donutCy - 6} textAnchor="middle" fill="#F5F5F5" fontSize={20} fontWeight={700} fontFamily="DM Sans, sans-serif">{donutTotal}</text>
                            <text x={donutCx} y={donutCy + 12} textAnchor="middle" fill="#6B7280" fontSize={10} fontFamily="JetBrains Mono, monospace">total</text>
                          </svg>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                            {analytics.enrollmentsByTrack.map((t, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                                <div style={{ flex: 1, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{t.track}</div>
                                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: t.color }}>{Math.round((t.count / donutTotal) * 100)}%</div>
                              </div>
                            ))}
                            {analytics.enrollmentsByTrack.length === 0 && (
                              <div style={{ fontSize: 12, color: '#3A3F46' }}>No data yet</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stacked bar: student progress distribution */}
                      <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, padding: '20px 24px' }}>
                        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#4CAF7D', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 18 }}>Student Progress Distribution</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {analytics.completionDistribution.map((d, i) => (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{d.label}</span>
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: d.color }}>{d.count} <span style={{ color: '#3A3F46' }}>({Math.round((d.count / distTotal) * 100)}%)</span></span>
                              </div>
                              <div style={{ height: 8, background: '#2A2F35', borderRadius: 6 }}>
                                <div style={{ height: '100%', background: d.color, borderRadius: 6, width: `${Math.round((d.count / distTotal) * 100)}%`, transition: 'width 0.4s ease' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 24 }}>
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#6B7280', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Avg Completion by Course</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {analytics.avgCompletionByCourse.map((c, i) => {
                              const tColor = tracksMap[c.track]?.color || '#D59C10';
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#3A3F46', width: 14 }}>{i + 1}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{c.title}</div>
                                    <div style={{ height: 4, background: '#2A2F35', borderRadius: 4 }}>
                                      <div style={{ height: '100%', background: tColor, borderRadius: 4, width: `${c.avg}%` }} />
                                    </div>
                                  </div>
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B7280', flexShrink: 0 }}>{c.avg}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })() : (
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
                <p style={{ fontSize: 13, color: '#6B7280', marginTop: 5 }}>{students.filter(student => student.approval_status === 'pending').length} account{students.filter(student => student.approval_status === 'pending').length === 1 ? '' : 's'} awaiting approval</p>
              </div>
              <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2F35' }}>
                      {['Name', 'Email', 'Track', 'Status', 'Joined', 'Action'].map(h => (
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
                          <td style={{ padding: '13px 16px' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', background: s.approval_status === 'approved' ? 'rgba(76,175,125,0.12)' : s.approval_status === 'rejected' ? 'rgba(248,113,113,0.12)' : 'rgba(213,156,16,0.12)', color: s.approval_status === 'approved' ? '#4CAF7D' : s.approval_status === 'rejected' ? '#F87171' : '#D59C10' }}>
                              {s.approval_status || 'approved'}
                            </span>
                          </td>
                          <td style={{ padding: '13px 16px', fontSize: 12, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>
                            {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '13px 16px' }} onClick={event => event.stopPropagation()}>
                            {s.approval_status === 'pending' ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button disabled={updatingApproval === s.id} onClick={() => setAccountApproval(s, 'approved')} style={{ background: 'rgba(76,175,125,0.12)', border: '1px solid rgba(76,175,125,0.35)', color: '#4CAF7D', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                                <button disabled={updatingApproval === s.id} onClick={() => setAccountApproval(s, 'rejected')} style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                              </div>
                            ) : s.approval_status === 'rejected' ? (
                              <button disabled={updatingApproval === s.id} onClick={() => setAccountApproval(s, 'approved')} style={{ background: 'transparent', border: '1px solid #3A3F46', color: '#9CA3AF', borderRadius: 20, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>Approve</button>
                            ) : <span style={{ fontSize: 11, color: '#3A3F46' }}>—</span>}
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

          {activeTab === 'enrollment_requests' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// course access'}</div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5' }}>Enrollment Requests</h1>
                <p style={{ fontSize: 13, color: '#6B7280', marginTop: 5 }}>{enrollmentRequests.filter(request => request.status === 'pending').length} request(s) awaiting your review</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {enrollmentRequests.length === 0 && <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280', background: '#22262B', borderRadius: 16 }}>No course access requests.</div>}
                {enrollmentRequests.map(request => (
                  <div key={request.id} style={{ padding: '16px 18px', background: '#22262B', border: '1px solid #2A2F35', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#F5F5F5', fontSize: 14, fontWeight: 700 }}>{request.student_name}</div>
                      <div style={{ color: '#9CA3AF', fontSize: 12, marginTop: 3 }}>{request.student_email}</div>
                      <div style={{ color: '#D59C10', fontSize: 12, marginTop: 5 }}>{request.course_title}</div>
                      <div style={{ color: '#6B7280', fontSize: 10, marginTop: 4 }}>{new Date(request.created_at).toLocaleString()}</div>
                    </div>
                    <span style={{ color: request.status === 'approved' ? '#4CAF7D' : request.status === 'rejected' ? '#F87171' : '#D59C10', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{request.status}</span>
                    {request.status === 'pending' && <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={reviewingEnrollment === request.id} onClick={() => reviewEnrollmentRequest(request, 'approved')} style={{ background: '#4CAF7D', border: 'none', borderRadius: 20, padding: '7px 16px', color: '#1A1D21', fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                      <button disabled={reviewingEnrollment === request.id} onClick={() => reviewEnrollmentRequest(request, 'rejected')} style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 20, padding: '7px 16px', color: '#F87171', cursor: 'pointer' }}>Decline</button>
                    </div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBMISSIONS */}
          {activeTab === 'submissions' && (() => {
            const grouped: Record<string, { instructor: string; subs: Submission[] }> = {};
            for (const sub of submissions) {
              const key = sub.course_title || `Course ${sub.course_id}`;
              if (!grouped[key]) grouped[key] = { instructor: sub.course_instructor, subs: [] };
              grouped[key].subs.push(sub);
            }
            return (
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {Object.entries(grouped).map(([courseTitle, { instructor, subs }]) => (
                      <div key={courseTitle}>
                        <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #2A2F35' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F5' }}>{courseTitle}</div>
                          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                            Instructor: <span style={{ color: '#9CA3AF' }}>{instructor}</span>
                            <span style={{ marginLeft: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#3A3F46' }}>{subs.length} submission{subs.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {subs.map(sub => (
                            <div key={sub.id} style={{
                              background: '#22262B', border: `1px solid ${sub.status === 'pending' ? 'rgba(213,156,16,0.3)' : sub.status === 'approved' ? 'rgba(76,175,125,0.25)' : 'rgba(248,113,113,0.25)'}`,
                              borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', padding: '2px 8px', borderRadius: 20, background: sub.status === 'pending' ? 'rgba(213,156,16,0.12)' : sub.status === 'approved' ? 'rgba(76,175,125,0.12)' : 'rgba(248,113,113,0.12)', color: sub.status === 'pending' ? '#D59C10' : sub.status === 'approved' ? '#4CAF7D' : '#F87171' }}>
                                    {sub.status.toUpperCase()}
                                  </span>
                                  <span style={{ fontSize: 11, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>{sub.lesson_type}</span>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F5', marginBottom: 2 }}>{sub.student_name}</div>
                                <div style={{ fontSize: 12, color: '#6B7280' }}>{sub.lesson_title}</div>
                                <div style={{ fontSize: 11, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', marginTop: 3 }}>
                                  {new Date(sub.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <button onClick={() => openSubmissionReview(sub)} style={{ background: '#1A1D21', border: '1px solid #3A3F46', borderRadius: 20, padding: '7px 18px', fontSize: 13, color: '#F5F5F5', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {sub.status === 'pending' ? 'Review' : 'View'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

        </main>
      </div>

      {/* Submission review modal */}
      {selectedSubmission && (
        <div onClick={e => { if (e.target === e.currentTarget) { setSelectedSubmission(null); setGradingFeedback(''); } }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1D21', border: '1px solid #2A2F35', borderRadius: 20, width: '100%', maxWidth: 880, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

              {selectedSubmission.rubric_criteria.length > 0 && (() => {
                const acceptanceCriterion = selectedSubmission.rubric_criteria.find(criterion => criterion.id === 'acceptance_tests');
                const acceptanceScore = acceptanceCriterion && acceptanceTotal > 0
                  ? Math.round(acceptanceCriterion.max_points * Math.min(acceptancePassed, acceptanceTotal) / acceptanceTotal)
                  : 0;
                const totalScore = selectedSubmission.rubric_criteria.reduce((total, criterion) => {
                  const score = criterion.id === 'acceptance_tests' ? acceptanceScore : Number(rubricScores[criterion.id]) || 0;
                  return total + Math.min(score, criterion.max_points);
                }, 0);
                const maxScore = selectedSubmission.rubric_criteria.reduce((total, criterion) => total + criterion.max_points, 0);
                return (
                  <div style={{ marginBottom: 20, background: '#22262B', border: '1px solid #2A2F35', borderRadius: 12, padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: '#D59C10', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Grading rubric</div>
                      <div style={{ color: totalScore >= 80 ? '#4CAF7D' : '#D59C10', fontSize: 18, fontWeight: 800 }}>{totalScore} / {maxScore}</div>
                    </div>
                    {acceptanceCriterion && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 20px 90px', gap: 8, alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #2A2F35' }}>
                        <div>
                          <div style={{ color: '#F5F5F5', fontSize: 13, fontWeight: 600 }}>{acceptanceCriterion.title}</div>
                          <div style={{ color: '#6B7280', fontSize: 11, marginTop: 3 }}>{acceptanceCriterion.description}</div>
                        </div>
                        <input aria-label="Acceptance tests passed" style={{ ...inputStyle, textAlign: 'center' }} type="number" min={0} max={acceptanceTotal || undefined} value={acceptancePassed} onChange={event => setAcceptancePassed(Math.max(0, Number(event.target.value) || 0))} />
                        <span style={{ color: '#6B7280', textAlign: 'center' }}>/</span>
                        <input aria-label="Acceptance tests total" style={{ ...inputStyle, textAlign: 'center' }} type="number" min={0} value={acceptanceTotal} onChange={event => setAcceptanceTotal(Math.max(0, Number(event.target.value) || 0))} />
                        <div style={{ gridColumn: '1 / -1', color: '#4E8FD4', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>{acceptancePassed}/{acceptanceTotal || 0} tests = {acceptanceScore}/{acceptanceCriterion.max_points} points</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedSubmission.rubric_criteria.filter(criterion => criterion.id !== 'acceptance_tests').map(criterion => (
                        <div key={criterion.id} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 12, alignItems: 'center' }}>
                          <div>
                            <div style={{ color: '#F5F5F5', fontSize: 13, fontWeight: 600 }}>{criterion.title}</div>
                            <div style={{ color: '#6B7280', fontSize: 11, marginTop: 3 }}>{criterion.description}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input aria-label={`${criterion.title} score`} style={{ ...inputStyle, textAlign: 'center', width: 70 }} type="number" min={0} max={criterion.max_points} value={rubricScores[criterion.id] ?? ''} onChange={event => setRubricScores(scores => ({ ...scores, [criterion.id]: Math.min(criterion.max_points, Math.max(0, Number(event.target.value) || 0)) }))} />
                            <span style={{ color: '#6B7280', fontSize: 12 }}>/ {criterion.max_points}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 16 }}>
                      <label style={labelStyle}>Decision when returning</label>
                      <select style={{ ...inputStyle, cursor: 'pointer' }} value={gradingDecision} onChange={event => setGradingDecision(event.target.value as 'revise' | 'not_yet')}>
                        <option value="revise">Revise and resubmit</option>
                        <option value="not_yet">Not yet</option>
                      </select>
                    </div>
                  </div>
                );
              })()}

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

              {selectedSubmission.status !== 'pending' && (
                <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: selectedSubmission.status === 'approved' ? 'rgba(76,175,125,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${selectedSubmission.status === 'approved' ? 'rgba(76,175,125,0.3)' : 'rgba(248,113,113,0.3)'}`, fontSize: 13, color: selectedSubmission.status === 'approved' ? '#4CAF7D' : '#F87171', fontWeight: 600 }}>
                  {selectedSubmission.status === 'approved' ? 'Already approved' : 'Already returned for rework'}
                </div>
              )}
              {(selectedSubmission.course_instructor_id === adminId || selectedSubmission.course_instructor_ids.includes(adminId) || selectedSubmission.user_id === adminId) ? (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(213,156,16,0.08)', border: '1px solid rgba(213,156,16,0.25)', fontSize: 13, color: '#D59C10', textAlign: 'center' }}>
                  {selectedSubmission.user_id === adminId
                    ? 'You cannot approve your own submission.'
                    : 'You cannot approve or reject your own course submissions. Another admin must review this.'}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  {selectedSubmission.status !== 'approved' && (
                    <button onClick={() => gradeSubmission('approved')} disabled={grading} style={{ flex: 1, padding: '10px 0', borderRadius: 50, fontWeight: 700, fontSize: 14, border: 'none', background: grading ? '#22262B' : '#4CAF7D', color: grading ? '#6B7280' : '#1A1D21', cursor: grading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      {grading ? 'Saving...' : 'Approve'}
                    </button>
                  )}
                  {selectedSubmission.status !== 'rework' && (
                    <button onClick={() => gradeSubmission('rework')} disabled={grading} style={{ flex: 1, padding: '10px 0', borderRadius: 50, fontWeight: 700, fontSize: 14, border: '1px solid rgba(248,113,113,0.4)', background: 'transparent', color: '#F87171', cursor: grading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      Return for Rework
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enrollments modal */}
      {enrollmentsCourse && (
        <div onClick={e => { if (e.target === e.currentTarget) setEnrollmentsCourse(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1D21', border: '1px solid #2A2F35', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #2A2F35', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#4E8FD4', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 4 }}>Enrollments</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F5' }}>{enrollmentsCourse.title}</div>
              </div>
              <button onClick={() => setEnrollmentsCourse(null)} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>x</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {enrollmentsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>Loading...</div>
              ) : enrollmentsData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>No students enrolled yet</div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>{enrollmentsData.length} student{enrollmentsData.length !== 1 ? 's' : ''} enrolled</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {enrollmentsData.map(row => (
                      <div key={row.user_id} style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(78,143,212,0.12)', border: '1px solid rgba(78,143,212,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#4E8FD4', flexShrink: 0 }}>
                          {row.student_name.slice(0, 1).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F5', marginBottom: 2 }}>{row.student_name}</div>
                          <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>
                            Enrolled {new Date(row.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: row.progress >= 100 ? '#4CAF7D' : row.progress > 0 ? '#D59C10' : '#6B7280', marginBottom: 4 }}>{row.progress}%</div>
                          <div style={{ width: 80, height: 4, background: '#2A2F35', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ width: `${row.progress}%`, height: '100%', background: row.progress >= 100 ? '#4CAF7D' : '#D59C10', borderRadius: 10, transition: 'width 0.4s' }} />
                          </div>
                          <div style={{ fontSize: 10, color: '#6B7280', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
                            {row.progress >= 100 ? 'Completed' : row.progress > 0 ? 'In Progress' : 'Not Started'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages tab content -- rendered inline in main, shown via activeTab */}
      {activeTab === 'messages' && adminId && (
        <div style={{ position: 'fixed', inset: 0, top: 56, left: sidebarCollapsed ? 64 : 240, padding: '2rem', background: '#1A1D21', zIndex: 10, overflowY: 'auto' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// messages'}</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#F5F5F5' }}>Messages</h1>
            <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>Direct messages with students</p>
          </div>
          <div style={{ height: 'calc(100vh - 200px)' }}>
            <MessageCenter userId={adminId} isAdmin={true} trackColor="#D59C10" />
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
