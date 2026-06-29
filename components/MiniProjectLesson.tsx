'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';

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

interface Props {
  lessonId: number;
  userId: string;
  trackColor: string;
  starterCode: string;
  instructions: string;
  isCompleted: boolean;
  onComplete: () => void;
}

export default function MiniProjectLesson({
  lessonId, userId, trackColor, starterCode, instructions, isCompleted, onComplete,
}: Props) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [code, setCode] = useState(starterCode || '# Write your solution here\n');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data } = await supabase
        .from('mini_project_test_cases')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index');
      setTestCases(data || []);
    };
    load();

    const worker = new Worker('/pyodide-worker.js');
    workerRef.current = worker;
    worker.onmessage = (e) => {
      if (e.data.type === 'ready') setPyodideReady(true);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [lessonId]);

  const runTests = async () => {
    if (!workerRef.current || !pyodideReady || running) return;
    setRunning(true);
    const allResults: TestResult[] = [];

    for (const tc of testCases) {
      // If test_code is empty, derive variable overrides from the description
      // (format: "celsius = 0, miles = 5") by splitting on commas.
      const rawTestCode = tc.test_code?.trim()
        || tc.description.split(',').map(s => s.trim()).join('\n');

      // Build variable overrides from test_code (e.g. celsius = 0).
      // Substitute into student code where the variable is defined,
      // and prepend any that the student didn't define so they're always set.
      const overrides: Record<string, string> = {};
      for (const line of rawTestCode.split('\n')) {
        const m = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
        if (m) overrides[m[1]] = line;
      }
      const injected = new Set<string>();
      const studentLines = code.split('\n').map(line => {
        const m = line.match(/^([A-Za-z_]\w*)\s*=/);
        if (m && overrides[m[1]]) { injected.add(m[1]); return overrides[m[1]]; }
        return line;
      });
      const prefix = Object.entries(overrides)
        .filter(([k]) => !injected.has(k))
        .map(([, v]) => v);
      const fullCode = [...prefix, ...studentLines].join('\n');
      const id = ++runIdRef.current;

      const result = await new Promise<TestResult>((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve({ id: tc.id, passed: false, actual: '', error: 'Timed out after 10s' });
        }, 10000);

        const handleMsg = (e: MessageEvent) => {
          if (e.data.runId !== id) return;
          clearTimeout(timeoutId);
          workerRef.current?.removeEventListener('message', handleMsg);
          if (e.data.type === 'output') {
            const actual = e.data.output.trim();
            const expected = tc.expected_output.trim();
            resolve({ id: tc.id, passed: actual === expected, actual });
          } else {
            resolve({ id: tc.id, passed: false, actual: '', error: e.data.error });
          }
        };

        workerRef.current!.addEventListener('message', handleMsg);
        workerRef.current!.postMessage({ type: 'run', code: fullCode, runId: id });
      });

      allResults.push(result);
    }

    setResults(allResults);
    setRunning(false);

    const allPassed = allResults.every(r => r.passed);
    setSaving(true);
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('mini_project_results').upsert(
      {
        user_id: userId, lesson_id: lessonId,
        all_passed: allPassed, attempts: 1,
        last_attempt_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_id' }
    );
    setSaving(false);
    if (allPassed) onComplete();
  };

  const allPassed = results.length > 0 && results.every(r => r.passed);
  const passCount = results.filter(r => r.passed).length;

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
              solution.py
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCode(starterCode || '# Write your solution here\n')} style={{
              background: 'transparent', border: '1px solid #2A2F35', borderRadius: 20,
              padding: '4px 14px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
              color: '#6B7280', cursor: 'pointer',
            }}>Reset</button>
            <button
              onClick={runTests}
              disabled={running || !pyodideReady || testCases.length === 0}
              style={{
                padding: '5px 20px', borderRadius: 50, fontWeight: 700, fontSize: 13,
                fontFamily: 'DM Sans, sans-serif', border: 'none',
                background: running ? '#22262B' : allPassed ? 'rgba(76,175,125,0.15)' : trackColor,
                color: running ? '#6B7280' : allPassed ? '#4CAF7D' : '#1A1D21',
                cursor: running || !pyodideReady ? 'not-allowed' : 'pointer',
              }}>
              {running ? 'Running Tests...' : !pyodideReady ? 'Loading Python...' : allPassed ? 'All Tests Pass' : 'Run Tests'}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Editor
            height="100%"
            language="python"
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
