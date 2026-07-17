'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createRunnerWorker, runTestCases, type Language } from '@/lib/codeRunner';
import { notify } from '@/lib/notify';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface TestCase {
  id: number;
  description: string;
  test_code: string;
  expected_output: string;
  order_index: number;
}

interface TestResult {
  id: number;
  passed: boolean;
  actual: string;
  error?: string;
}

type SubmissionStatus = 'pending' | 'approved' | 'changes_requested';

interface Submission {
  id: number;
  status: SubmissionStatus;
  feedback: string | null;
  created_at: string;
}

interface Props {
  lessonId: number;
  courseId: number;
  userId: string;
  trackColor: string;
  starterCode: string;
  instructions: string;
  language?: string;
  isCompleted: boolean;
  onComplete: () => void;
}

export default function MiniProjectLesson({
  lessonId, courseId, userId, trackColor, starterCode, instructions, language = 'python', isCompleted, onComplete,
}: Props) {
  const storageKey = `dm_mp_code_${lessonId}`;
  const defaultSnippet = language === 'python' ? '# Write your solution here\n' : '// Write your solution here\n';

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [code, setCode] = useState(() => {
    try { return localStorage.getItem(storageKey) || starterCode || defaultSnippet; } catch { return starterCode || defaultSnippet; }
  });
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [runnerReady, setRunnerReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);

  // Persist code to localStorage on every edit.
  useEffect(() => {
    try { localStorage.setItem(storageKey, code); } catch { /* ignore */ }
  }, [code, storageKey]);

  useEffect(() => {
    const load = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const [{ data: tcData }, { data: resultData }, { data: subData }] = await Promise.all([
        supabase.from('mini_project_test_cases').select('*').eq('lesson_id', lessonId).order('order_index'),
        supabase.from('mini_project_results').select('submitted_code').eq('lesson_id', lessonId).eq('user_id', userId).maybeSingle(),
        supabase.from('submissions').select('id, status, feedback, created_at').eq('lesson_id', lessonId).eq('user_id', userId).eq('kind', 'code').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      setTestCases(tcData || []);
      if (subData) setSubmission(subData);
      if (resultData?.submitted_code) {
        setCode(resultData.submitted_code);
        try { localStorage.setItem(storageKey, resultData.submitted_code); } catch { /* ignore */ }
      }
    };
    load();

    const worker = createRunnerWorker(language as Language);
    workerRef.current = worker;
    worker.onmessage = (e) => {
      if (e.data.type === 'ready') setRunnerReady(true);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [lessonId, language]);

  const runTests = async () => {
    if (!workerRef.current || !runnerReady || running) return;
    setRunning(true);

    const allResults = await runTestCases(
      workerRef.current, testCases, code, language as Language, () => ++runIdRef.current,
    );

    setResults(allResults);
    setRunning(false);

    const allPassed = allResults.every(r => r.passed);
    setSaving(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('mini_project_results').upsert(
      {
        user_id: userId, lesson_id: lessonId,
        all_passed: allPassed,
        submitted_code: code,
        last_attempt_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );
    setSaving(false);
    if (allPassed) onComplete();
  };

  const allPassed = results.length > 0 && results.every(r => r.passed);
  const passCount = results.filter(r => r.passed).length;

  const submitForReview = async () => {
    setSubmitting(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data, error } = await supabase.from('submissions').insert({
      user_id: userId, lesson_id: lessonId, course_id: courseId,
      kind: 'code', lesson_type: 'mini_project', submitted_code: code,
      note: submitNote.trim() || null, status: 'pending',
    }).select('id, status, feedback, created_at').single();
    if (!error && data) {
      setSubmission(data);
      setShowSubmitForm(false);
      setSubmitNote('');
      notify({ adminBroadcast: true, type: 'project_submitted', title: 'New project submission', message: 'A student submitted a mini project for review.', link: '/admin' });
    }
    setSubmitting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Instructions + test case status panel */}
      <div style={{
        flex: '0 0 auto', padding: '1.5rem 2rem',
        borderBottom: '1px solid #2A2F35', overflowY: 'auto',
        maxHeight: '45%', minHeight: 120,
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: trackColor,
          letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12,
        }}>Mini Project</div>

        {allPassed && (
          <div style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: 16,
            background: 'rgba(76,175,125,0.08)', border: '1px solid rgba(76,175,125,0.3)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#4CAF7D' }}>All tests passed!</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Click <strong style={{ color: '#F5F5F5' }}>Next</strong> in the toolbar to continue.</div>
            </div>
          </div>
        )}

        {submission && (
          <div style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: 16,
            background: submission.status === 'approved' ? 'rgba(76,175,125,0.08)' : submission.status === 'changes_requested' ? 'rgba(248,113,113,0.08)' : 'rgba(213,156,16,0.08)',
            border: `1px solid ${submission.status === 'approved' ? 'rgba(76,175,125,0.3)' : submission.status === 'changes_requested' ? 'rgba(248,113,113,0.3)' : 'rgba(213,156,16,0.3)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: submission.feedback ? 6 : 0 }}>
              <span style={{ fontSize: 16 }}>{submission.status === 'approved' ? '✓' : submission.status === 'changes_requested' ? '↩' : '⏳'}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: submission.status === 'approved' ? '#4CAF7D' : submission.status === 'changes_requested' ? '#F87171' : '#D59C10' }}>
                {submission.status === 'approved' ? 'Submission approved!' : submission.status === 'changes_requested' ? 'Changes requested' : 'Submitted for review'}
              </span>
            </div>
            {submission.feedback && (
              <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4, paddingLeft: 24 }}>
                <span style={{ color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Instructor feedback: </span>
                {submission.feedback}
              </div>
            )}
          </div>
        )}

        {!submission && (
          <div style={{ marginBottom: 16 }}>
            {!showSubmitForm ? (
              <button onClick={() => setShowSubmitForm(true)} style={{
                background: trackColor, border: 'none',
                borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 700,
                color: '#1A1D21', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                width: '100%', display: 'block', letterSpacing: '-0.01em',
              }}>Submit Project for Review</button>
            ) : (
              <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Add a note for your instructor (optional)</div>
                <textarea
                  name="submit-note"
                  value={submitNote}
                  onChange={e => setSubmitNote(e.target.value)}
                  placeholder="e.g. I got stuck on part 2, tried X approach..."
                  rows={3}
                  style={{ width: '100%', background: '#1A1D21', border: '1px solid #3A3F46', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={submitForReview} disabled={submitting} style={{ background: trackColor, border: 'none', borderRadius: 20, padding: '6px 20px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                  <button onClick={() => setShowSubmitForm(false)} style={{ background: 'transparent', border: '1px solid #3A3F46', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {submission?.status === 'changes_requested' && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => { setSubmission(null); setShowSubmitForm(true); }} style={{
              background: 'transparent', border: '1px solid #F87171',
              borderRadius: 20, padding: '6px 18px', fontSize: 13, fontWeight: 600,
              color: '#F87171', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}>Resubmit</button>
          </div>
        )}

        {instructions && (
          <div style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7, marginBottom: '1.25rem', whiteSpace: 'pre-wrap' }}>
            {instructions}
          </div>
        )}

        {testCases.length > 0 && (
          <>
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8,
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Test Cases{results.length > 0 ? ` (${passCount}/${testCases.length} passing)` : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {testCases.map(tc => {
                const res = results.find(r => r.id === tc.id);
                return (
                  <div key={tc.id} style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: res ? (res.passed ? 'rgba(76,175,125,0.06)' : 'rgba(248,113,113,0.06)') : '#22262B',
                    border: `1px solid ${res ? (res.passed ? 'rgba(76,175,125,0.25)' : 'rgba(248,113,113,0.25)') : '#2A2F35'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: res ? (res.passed ? '#4CAF7D' : '#F87171') : '#6B7280' }}>
                        {res ? (res.passed ? '✓' : '✗') : '○'}
                      </span>
                      <span style={{ fontSize: 13, color: '#9CA3AF', flex: 1 }}>{tc.description}</span>
                      {res && (
                        <span style={{
                          fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                          color: res.passed ? '#4CAF7D' : '#F87171',
                        }}>{res.passed ? 'PASS' : 'FAIL'}</span>
                      )}
                    </div>
                    {res && !res.passed && (
                      <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', paddingLeft: 21, marginTop: 6 }}>
                        {res.error ? (
                          <span style={{ color: '#F87171' }}>Error: {res.error}</span>
                        ) : (
                          <>
                            <div style={{ color: '#6B7280' }}>
                              Expected: <span style={{ color: '#E5E7EB' }}>{tc.expected_output.trim()}</span>
                            </div>
                            <div style={{ color: '#6B7280' }}>
                              Got: <span style={{ color: '#F87171' }}>{res.actual || '(no output)'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Monaco editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', background: '#1A1D21', borderBottom: '1px solid #2A2F35',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
            </div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#6B7280', marginLeft: 8 }}>
              solution.{language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : 'py'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCode(starterCode || defaultSnippet)} style={{
              background: 'transparent', border: '1px solid #2A2F35', borderRadius: 20,
              padding: '4px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: '#6B7280', cursor: 'pointer',
            }}>Reset</button>
            <button
              onClick={runTests}
              disabled={running || !runnerReady || testCases.length === 0}
              style={{
                padding: '5px 20px', borderRadius: 50, fontWeight: 700, fontSize: 13,
                fontFamily: 'DM Sans, sans-serif', border: 'none',
                background: running ? '#22262B' : allPassed ? 'rgba(76,175,125,0.15)' : trackColor,
                color: running ? '#6B7280' : allPassed ? '#4CAF7D' : '#1A1D21',
                cursor: running || !runnerReady ? 'not-allowed' : 'pointer',
              }}>
              {running ? 'Running Tests...' : !runnerReady ? 'Loading runtime...' : allPassed ? 'All Tests Pass' : 'Run Tests'}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Editor
            height="100%"
            language={language || 'python'}
            value={code}
            onChange={val => setCode(val || '')}
            theme="vs-dark"
            options={{
              fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false }, scrollBeyondLastLine: false,
              lineNumbers: 'on', padding: { top: 16, bottom: 16 },
              wordWrap: 'on', tabSize: 4, automaticLayout: true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
