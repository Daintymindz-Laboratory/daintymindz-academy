'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';

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

interface Props {
  lessonId: number;
  userId: string;
  trackColor: string;
  starterCode: string;
  instructions: string;
  language: string;
  codeLabel: string;
  embedUrl: string | null;
  isCompleted: boolean;
  onComplete: () => void;
}

export default function ProjectLesson({
  lessonId, userId, trackColor, starterCode, instructions,
  language, codeLabel, embedUrl, isCompleted, onComplete,
}: Props) {
  const storageKey = `dm_proj_code_${lessonId}`;

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [code, setCode] = useState(() => {
    try { return localStorage.getItem(storageKey) || starterCode || '# Write your solution here\n'; } catch { return starterCode || '# Write your solution here\n'; }
  });
  const [activeTab, setActiveTab] = useState<'instructions' | 'output'>('instructions');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const runTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { localStorage.setItem(storageKey, code); } catch { /* ignore */ }
  }, [code, storageKey]);

  useEffect(() => {
    const load = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const [{ data: tcData }, { data: resultData }] = await Promise.all([
        supabase.from('mini_project_test_cases').select('*').eq('lesson_id', lessonId).order('order_index'),
        supabase.from('mini_project_results').select('submitted_code').eq('lesson_id', lessonId).eq('user_id', userId).maybeSingle(),
      ]);
      setTestCases(tcData || []);
      if (resultData?.submitted_code) {
        setCode(resultData.submitted_code);
        try { localStorage.setItem(storageKey, resultData.submitted_code); } catch { /* ignore */ }
      }
    };
    load();

    const workerSrc = `
let pyodide = null;
self.importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');
async function init() {
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/' });
  pyodide.runPython('import sys, io; _orig_stdout = sys.stdout');
  self.postMessage({ type: 'ready' });
}
self.onmessage = async (e) => {
  const { type, code, runId } = e.data;
  if (type !== 'run') return;
  if (!pyodide) { self.postMessage({ type: 'error', error: 'Pyodide not loaded yet.', runId }); return; }
  try {
    try { await pyodide.loadPackagesFromImports(code); } catch (_) {}
    pyodide.globals.set('_code', code);
    const out = await pyodide.runPythonAsync(\`
_buf = io.StringIO()
sys.stdout = _buf
try:
    exec(compile(_code, '<student>', 'exec'), {'__builtins__': __builtins__})
finally:
    sys.stdout = _orig_stdout
_buf.getvalue()
\`);
    self.postMessage({ type: 'output', output: out || '(no output)', runId });
  } catch (err) {
    try { pyodide.runPython('sys.stdout = _orig_stdout'); } catch (_) {}
    self.postMessage({ type: 'error', error: String(err.message || err), runId });
  }
};
init().catch(err => self.postMessage({ type: 'error', error: 'Failed to load Python runtime: ' + err.message }));
`;
    const blob = new Blob([workerSrc], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;
    worker.onmessage = (e) => { if (e.data.type === 'ready') setPyodideReady(true); };
    return () => { worker.terminate(); workerRef.current = null; };
  }, [lessonId]);

  const runCode = () => {
    if (!workerRef.current || !pyodideReady) return;
    setRunning(true);
    setActiveTab('output');
    setOutput('Running...\n');
    if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current);
    const id = ++runIdRef.current;
    const handleMsg = (e: MessageEvent) => {
      if (e.data.runId !== id) return;
      workerRef.current?.removeEventListener('message', handleMsg);
      if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current);
      if (e.data.type === 'output') setOutput(e.data.output);
      else setOutput(`Error:\n${e.data.error}`);
      setRunning(false);
    };
    runTimeoutRef.current = setTimeout(() => {
      workerRef.current?.removeEventListener('message', handleMsg);
      setOutput('Error:\nExecution timed out after 10 seconds.');
      setRunning(false);
    }, 10000);
    workerRef.current.addEventListener('message', handleMsg);
    workerRef.current.postMessage({ type: 'run', code, runId: id });
  };

  const runTests = async () => {
    if (!workerRef.current || !pyodideReady || testRunning) return;
    setTestRunning(true);
    setActiveTab('instructions');
    const allResults: TestResult[] = [];

    const normalizeOutput = (s: string) =>
      s.trim().replace(/ then /g, '\n').replace(/ \/ /g, '\n').replace(/'/g, '"');

    const replaceAssignment = (src: string, varName: string, newValue: string): string => {
      const lines = src.split('\n');
      const start = lines.findIndex(l => new RegExp(`^\\s*${varName}\\s*=`).test(l));
      if (start === -1) return src;
      let depth = 0, end = start;
      for (let i = start; i < lines.length; i++) {
        for (const ch of lines[i]) {
          if ('([{'.includes(ch)) depth++;
          if (')]}'.includes(ch)) depth--;
        }
        if (i > start && depth <= 0) { end = i; break; }
        if (i === start && depth === 0) { end = i; break; }
      }
      return [...lines.slice(0, start), `${varName} = ${newValue}`, ...lines.slice(end + 1)].join('\n');
    };

    for (const tc of testCases) {
      const desc = tc.description.trim();
      const isDataLiteral = /^[\[{]/.test(desc);
      const isFunctionCall = !isDataLiteral && /^[A-Za-z_]\w*\s*\(/.test(desc);

      let fullCode: string;

      if (isDataLiteral) {
        const assignLine = code.split('\n').find(l => /^[A-Za-z_]\w*\s*=\s*[\[{]/.test(l.trim()));
        const varName = assignLine?.match(/^([A-Za-z_]\w*)\s*=/)?.[1];
        fullCode = varName ? replaceAssignment(code, varName, desc) : code;
      } else if (isFunctionCall) {
        const funcName = desc.match(/^([A-Za-z_]\w*)\s*\(/)?.[1] ?? '';
        const printWrapped = code.includes(`print(${funcName}(`);
        const callToAppend = printWrapped ? `print(${desc})` : desc;
        const studentLines = code.split('\n').filter(l => {
          const trimmed = l.trim();
          if (!trimmed || trimmed.startsWith('def ') || trimmed.startsWith('class ')) return true;
          const isTopLevel = l.length > 0 && l[0] !== ' ' && l[0] !== '\t';
          return !(isTopLevel && trimmed.includes(`${funcName}(`));
        });
        fullCode = [...studentLines, '', callToAppend].join('\n');
      } else {
        const overrides: Record<string, string> = {};
        for (const part of desc.split(',')) {
          const m = part.trim().match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
          if (m) overrides[m[1]] = `${m[1]} = ${m[2].trim()}`;
        }
        const injected = new Set<string>();
        const studentLines = code.split('\n').map(line => {
          const m = line.match(/^([A-Za-z_]\w*)\s*=/);
          if (m && overrides[m[1]]) { injected.add(m[1]); return overrides[m[1]]; }
          return line;
        });
        const prefix = Object.entries(overrides).filter(([k]) => !injected.has(k)).map(([, v]) => v);
        fullCode = [...prefix, ...studentLines].join('\n');
      }

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
            const actual = normalizeOutput(e.data.output);
            const expected = normalizeOutput(tc.expected_output);
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

              {(allPassed || isCompleted) && (
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
            <button onClick={runCode} disabled={running || testRunning || !pyodideReady} style={{ padding: '5px 16px', borderRadius: 50, fontWeight: 600, fontSize: 13, fontFamily: 'DM Sans, sans-serif', border: '1px solid #3A3F46', background: 'transparent', color: running || !pyodideReady ? '#6B7280' : '#F5F5F5', cursor: running || !pyodideReady ? 'not-allowed' : 'pointer' }}>
              {running ? 'Running...' : !pyodideReady ? 'Loading...' : 'Run Code'}
            </button>
            {hasTests ? (
              <button onClick={runTests} disabled={testRunning || running || !pyodideReady} style={{ padding: '5px 20px', borderRadius: 50, fontWeight: 700, fontSize: 13, fontFamily: 'DM Sans, sans-serif', border: 'none', background: testRunning ? '#22262B' : allPassed ? 'rgba(76,175,125,0.15)' : trackColor, color: testRunning ? '#6B7280' : allPassed ? '#4CAF7D' : '#1A1D21', cursor: testRunning || !pyodideReady ? 'not-allowed' : 'pointer' }}>
                {testRunning ? 'Running Tests...' : allPassed ? 'All Tests Pass' : 'Run Tests'}
              </button>
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
