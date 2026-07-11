'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import { createRunnerWorker, runOneTest, runTestCases, type Language } from '@/lib/codeRunner';
import LessonSubmission from '@/components/LessonSubmission';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface TestCase {
  id: number;
  description: string;
  expected_output: string;
  order_index: number;
}

interface TestResult {
  id: number;
  passed: boolean;
  actual: string;
  error?: string;
}

type SubmissionStatus = 'pending' | 'approved' | 'rework';

interface Submission {
  id: number;
  status: SubmissionStatus;
  feedback: string | null;
  submitted_at: string;
}

interface Props {
  lessonId: number;
  courseId: number;
  userId: string;
  trackColor: string;
  starterCode: string;
  instructions: string;
  language: string;
  codeLabel: string;
  embedUrl: string | null;
  isCompleted: boolean;
  requiresReview: boolean;
  onComplete: () => void;
}

export default function ProjectLesson({
  lessonId, courseId, userId, trackColor, starterCode, instructions,
  language, codeLabel, embedUrl, isCompleted, requiresReview, onComplete,
}: Props) {
  const storageKey = `dm_proj_code_${lessonId}`;
  const defaultSnippet = language === 'python' ? '# Write your solution here\n' : '// Write your solution here\n';

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [code, setCode] = useState(() => {
    try { return localStorage.getItem(storageKey) || starterCode || defaultSnippet; } catch { return starterCode || defaultSnippet; }
  });
  const [activeTab, setActiveTab] = useState<'instructions' | 'output'>('instructions');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [runnerReady, setRunnerReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);

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
        supabase.from('project_submissions').select('id, status, feedback, submitted_at').eq('lesson_id', lessonId).eq('user_id', userId).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
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
    worker.onmessage = (e) => { if (e.data.type === 'ready') setRunnerReady(true); };
    return () => { worker.terminate(); workerRef.current = null; };
  }, [lessonId, language]);

  const runCode = async () => {
    if (!workerRef.current || !runnerReady) return;
    setRunning(true);
    setActiveTab('output');
    setOutput('Running...\n');
    const id = ++runIdRef.current;
    const { output, error } = await runOneTest(workerRef.current, code, id);
    setOutput(error ? `Error:\n${error}` : (output || '(no output)'));
    setRunning(false);
  };

  const runTests = async () => {
    if (!workerRef.current || !runnerReady || testRunning) return;
    setTestRunning(true);
    setActiveTab('instructions');

    const allResults = await runTestCases(
      workerRef.current, testCases, code, language as Language, () => ++runIdRef.current,
    );

    setResults(allResults);
    setTestRunning(false);

    const allPassed = allResults.every(r => r.passed);
    setSaving(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('mini_project_results').upsert(
      { user_id: userId, lesson_id: lessonId, all_passed: allPassed, submitted_code: code, last_attempt_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );
    setSaving(false);
    if (allPassed) onComplete();
  };

  const allPassed = results.length > 0 && results.every(r => r.passed);
  const passCount = results.filter(r => r.passed).length;
  const hasTests = testCases.length > 0;

  const submitForReview = async () => {
    setSubmitting(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    const { data, error } = await supabase.from('project_submissions').insert({
      user_id: userId, lesson_id: lessonId, course_id: courseId,
      lesson_type: 'project', submitted_code: code,
      notes: submitNote.trim() || null, status: 'pending',
    }).select('id, status, feedback, submitted_at').single();
    if (!error && data) {
      setSubmission(data);
      setShowSubmitForm(false);
      setSubmitNote('');
    }
    setSubmitting(false);
  };

  const submissionBanner = (
    <div style={{ padding: '0 2.5rem', paddingBottom: 16 }}>
      {submission && (
        <div style={{
          padding: '12px 16px', borderRadius: 12, marginBottom: 8,
          background: submission.status === 'approved' ? 'rgba(76,175,125,0.08)' : submission.status === 'rework' ? 'rgba(248,113,113,0.08)' : 'rgba(213,156,16,0.08)',
          border: `1px solid ${submission.status === 'approved' ? 'rgba(76,175,125,0.3)' : submission.status === 'rework' ? 'rgba(248,113,113,0.3)' : 'rgba(213,156,16,0.3)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: submission.feedback ? 6 : 0 }}>
            <span style={{ fontSize: 16 }}>{submission.status === 'approved' ? '✓' : submission.status === 'rework' ? '↩' : '⏳'}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: submission.status === 'approved' ? '#4CAF7D' : submission.status === 'rework' ? '#F87171' : '#D59C10' }}>
              {submission.status === 'approved' ? 'Submission approved!' : submission.status === 'rework' ? 'Needs rework' : 'Submitted for review'}
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
      {!submission && !showSubmitForm && (
        <button onClick={() => setShowSubmitForm(true)} style={{ background: 'transparent', border: `1px solid ${trackColor}`, borderRadius: 20, padding: '6px 18px', fontSize: 13, fontWeight: 600, color: trackColor, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Submit for review
        </button>
      )}
      {!submission && showSubmitForm && (
        <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Add a note for your instructor (optional)</div>
          <textarea value={submitNote} onChange={e => setSubmitNote(e.target.value)} placeholder="e.g. I got stuck on part 2..." rows={3} style={{ width: '100%', background: '#1A1D21', border: '1px solid #3A3F46', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#F5F5F5', fontFamily: 'DM Sans, sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={submitForReview} disabled={submitting} style={{ background: trackColor, border: 'none', borderRadius: 20, padding: '6px 20px', fontSize: 13, fontWeight: 700, color: '#1A1D21', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
            <button onClick={() => setShowSubmitForm(false)} style={{ background: 'transparent', border: '1px solid #3A3F46', borderRadius: 20, padding: '6px 16px', fontSize: 13, color: '#6B7280', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Cancel</button>
          </div>
        </div>
      )}
      {submission?.status === 'rework' && (
        <button onClick={() => { setSubmission(null); setShowSubmitForm(true); }} style={{ marginTop: 8, background: 'transparent', border: '1px solid #F87171', borderRadius: 20, padding: '6px 18px', fontSize: 13, fontWeight: 600, color: '#F87171', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
          Resubmit
        </button>
      )}
    </div>
  );

  return (
    <div className="lesson-split">
      {/* Left: instructions + test results */}
      <div style={{ borderRight: '1px solid #2A2F35', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #2A2F35', flexShrink: 0 }}>
          {(['instructions', 'output'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '12px 20px', background: 'none', border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${trackColor}` : '2px solid transparent',
              color: activeTab === tab ? '#F5F5F5' : '#6B7280',
              fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textTransform: 'capitalize',
            }}>
              {tab}
              {tab === 'output' && output && (
                <span style={{ marginLeft: 6, width: 6, height: 6, borderRadius: '50%', background: trackColor, display: 'inline-block', verticalAlign: 'middle' }} />
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>
          {activeTab === 'output' ? (
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3A3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>Output</div>
              {output
                ? <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: output.startsWith('Error') ? '#F87171' : '#4CAF7D', lineHeight: 1.75, background: '#22262B', border: '1px solid #2A2F35', borderRadius: 14, padding: '16px 18px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{output}</pre>
                : <div style={{ color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{'// run your code to see output here'}</div>
              }
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: trackColor, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>Project</div>
              </div>

              {allPassed && (
                <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 16, background: 'rgba(76,175,125,0.08)', border: '1px solid rgba(76,175,125,0.3)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>&#10003;</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#4CAF7D' }}>All tests passed!</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Click <strong style={{ color: '#F5F5F5' }}>Next</strong> in the toolbar to continue.</div>
                  </div>
                </div>
              )}

              {embedUrl && (
                <div style={{ marginBottom: '1.5rem', borderRadius: 12, overflow: 'hidden', border: '1px solid #2A2F35' }}>
                  <iframe src={embedUrl} width="100%" height="315" style={{ display: 'block', border: 'none' }} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                </div>
              )}

              {instructions && (
                <div style={{ fontSize: 15, lineHeight: 1.8, color: '#9CA3AF', marginBottom: '1.5rem' }}>
                  <ReactMarkdown components={{
                    h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 700, color: '#F5F5F5', margin: '1.25rem 0 0.75rem' }}>{children}</h1>,
                    h2: ({ children }) => <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F5F5F5', margin: '1.25rem 0 0.75rem' }}>{children}</h2>,
                    p: ({ children }) => <p style={{ marginBottom: '1rem', color: '#9CA3AF' }}>{children}</p>,
                    strong: ({ children }) => <strong style={{ color: '#F5F5F5' }}>{children}</strong>,
                    ul: ({ children }) => <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>{children}</ul>,
                    li: ({ children }) => <li style={{ marginBottom: '0.4rem', color: '#9CA3AF' }}>{children}</li>,
                    code: ({ children }) => <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, background: '#22262B', padding: '2px 6px', borderRadius: 4, color: '#E5E7EB' }}>{children}</code>,
                    pre: ({ children }) => <pre style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, background: '#22262B', border: '1px solid #2A2F35', borderRadius: 10, padding: '14px 16px', overflowX: 'auto', marginBottom: '1rem' }}>{children}</pre>,
                  }}>{instructions}</ReactMarkdown>
                </div>
              )}

              {submissionBanner}

              {hasTests && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
                              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: res.passed ? '#4CAF7D' : '#F87171' }}>
                                {res.passed ? 'PASS' : 'FAIL'}
                              </span>
                            )}
                          </div>
                          {res && !res.passed && (
                            <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', paddingLeft: 21, marginTop: 6 }}>
                              {res.error ? (
                                <span style={{ color: '#F87171' }}>Error: {res.error}</span>
                              ) : (
                                <>
                                  <div style={{ color: '#6B7280' }}>Expected: <span style={{ color: '#E5E7EB' }}>{tc.expected_output.trim()}</span></div>
                                  <div style={{ color: '#6B7280' }}>Got: <span style={{ color: '#F87171' }}>{res.actual || '(no output)'}</span></div>
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

              {!hasTests && requiresReview && (
                <LessonSubmission
                  key={lessonId}
                  lessonId={lessonId}
                  userId={userId}
                  trackColor={trackColor}
                  isCompleted={isCompleted}
                  onComplete={onComplete}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Monaco editor */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#1A1D21', borderBottom: '1px solid #2A2F35', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
            </div>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#6B7280', marginLeft: 8 }}>{codeLabel || 'solution.py'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3A3F46', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{language || 'python'}</span>
            <button onClick={() => setCode(starterCode || '')} style={{ background: 'transparent', border: '1px solid #2A2F35', borderRadius: 20, padding: '4px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>Reset</button>
            <button onClick={runCode} disabled={running || testRunning || !runnerReady} style={{ padding: '5px 16px', borderRadius: 50, fontWeight: 600, fontSize: 13, fontFamily: 'DM Sans, sans-serif', border: '1px solid #3A3F46', background: 'transparent', color: running || !runnerReady ? '#6B7280' : '#F5F5F5', cursor: running || !runnerReady ? 'not-allowed' : 'pointer' }}>
              {running ? 'Running...' : !runnerReady ? 'Loading...' : 'Run Code'}
            </button>
            {hasTests ? (
              <button onClick={runTests} disabled={testRunning || running || !runnerReady} style={{ padding: '5px 20px', borderRadius: 50, fontWeight: 700, fontSize: 13, fontFamily: 'DM Sans, sans-serif', border: 'none', background: testRunning ? '#22262B' : allPassed ? 'rgba(76,175,125,0.15)' : trackColor, color: testRunning ? '#6B7280' : allPassed ? '#4CAF7D' : '#1A1D21', cursor: testRunning || !runnerReady ? 'not-allowed' : 'pointer' }}>
                {testRunning ? 'Running Tests...' : allPassed ? 'All Tests Pass' : 'Run Tests'}
              </button>
            ) : requiresReview ? (
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: isCompleted ? '#4CAF7D' : '#6B7280' }}>
                {isCompleted ? 'Approved' : 'See submission panel'}
              </span>
            ) : (
              <button onClick={onComplete} style={{ padding: '5px 20px', borderRadius: 50, fontWeight: 700, fontSize: 13, fontFamily: 'DM Sans, sans-serif', border: isCompleted ? '1px solid rgba(76,175,125,0.3)' : 'none', background: isCompleted ? 'rgba(76,175,125,0.1)' : trackColor, color: isCompleted ? '#4CAF7D' : '#1A1D21', cursor: 'pointer' }}>
                {isCompleted ? 'Completed' : 'Mark Complete'}
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Editor
            height="100%"
            language={language || 'python'}
            value={code}
            onChange={val => setCode(val || '')}
            theme="vs-dark"
            options={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', padding: { top: 16, bottom: 16 }, wordWrap: 'on', tabSize: 4, automaticLayout: true }}
          />
        </div>
      </div>
    </div>
  );
}
