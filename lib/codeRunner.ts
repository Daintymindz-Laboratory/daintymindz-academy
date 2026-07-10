// Shared test-execution runtime for `project`/`mini_project` lessons.
// Extracted from the near-identical logic that used to live separately in
// components/MiniProjectLesson.tsx and components/ProjectLesson.tsx.

export type Language = 'python' | 'javascript' | 'typescript';

export interface RunnerTestCase {
  id: number;
  description: string;
  expected_output: string;
}

export interface TestResult {
  id: number;
  passed: boolean;
  actual: string;
  error?: string;
}

const LANG_CONFIG: Record<Language, { declKeywords: string[]; printFn: string }> = {
  python: { declKeywords: ['def', 'class'], printFn: 'print' },
  javascript: { declKeywords: ['function', 'const', 'let', 'var', 'class'], printFn: 'console.log' },
  typescript: { declKeywords: ['function', 'const', 'let', 'var', 'class'], printFn: 'console.log' },
};

// " / " and " then " are used by admins as newline separators in expected_output; Python
// (and our own repr-ish comparisons) use single quotes where expected_output
// often has double quotes, so both get normalized before comparing.
export function normalizeOutput(s: string): string {
  return s.trim().replace(/ then /g, '\n').replace(/ \/ /g, '\n').replace(/'/g, '"');
}

// Replaces a (potentially multi-line) variable assignment in student code.
// Tracks bracket depth so it handles `var = [\n  ...\n]` correctly.
function replaceAssignment(src: string, varName: string, newValue: string): string {
  const lines = src.split('\n');
  const start = lines.findIndex(l => new RegExp(`^\\s*${varName}\\s*=`).test(l));
  if (start === -1) return src;
  let depth = 0;
  let end = start;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if ('([{'.includes(ch)) depth++;
      if (')]}'.includes(ch)) depth--;
    }
    if (i > start && depth <= 0) { end = i; break; }
    if (i === start && depth === 0) { end = i; break; }
  }
  return [...lines.slice(0, start), `${varName} = ${newValue}`, ...lines.slice(end + 1)].join('\n');
}

// Determines how to drive a test case from its admin-authored `description`:
//
// Case A - data literal: description starts with [ or { (a list/array or
//   dict/object value). Find the first top-level list/dict assignment in
//   student code and replace the whole block with the test value.
//
// Case B - function call: description is "funcname(args)". Strip the
//   student's own top-level calls to that function and append this call.
//
// Case C - variable assignments: "celsius = 0, miles = 5". Substitute
//   matching lines in student code in-place.
//
// Known limitation: Case C's regex expects bare `name = value` reassignment
// and won't match idiomatic JS declarations like `const x = 5`. JS/TS test
// cases should prefer the function-call style until this is special-cased.
export function composeTestCode(studentCode: string, description: string, language: Language): string {
  const { declKeywords, printFn } = LANG_CONFIG[language];
  const desc = description.trim();
  const isDataLiteral = /^[[{]/.test(desc);
  const isFunctionCall = !isDataLiteral && /^[A-Za-z_]\w*\s*\(/.test(desc);

  if (isDataLiteral) {
    const assignLine = studentCode.split('\n').find(l => /^[A-Za-z_]\w*\s*=\s*[[{]/.test(l.trim()));
    const varName = assignLine?.match(/^([A-Za-z_]\w*)\s*=/)?.[1];
    return varName ? replaceAssignment(studentCode, varName, desc) : studentCode;
  }

  if (isFunctionCall) {
    const funcName = desc.match(/^([A-Za-z_]\w*)\s*\(/)?.[1] ?? '';
    // If the student wraps the call in a print/log, the function returns a
    // value and we must also wrap the test call. If they call it directly
    // the function prints/logs on its own.
    const printWrapped = studentCode.includes(`${printFn}(${funcName}(`);
    const callToAppend = printWrapped ? `${printFn}(${desc})` : desc;
    const studentLines = studentCode.split('\n').filter(l => {
      const trimmed = l.trim();
      if (!trimmed || declKeywords.some(k => trimmed.startsWith(`${k} `))) return true;
      // Strip any top-level line (no leading whitespace) that references the function.
      const isTopLevel = l.length > 0 && l[0] !== ' ' && l[0] !== '\t';
      return !(isTopLevel && trimmed.includes(`${funcName}(`));
    });
    return [...studentLines, '', callToAppend].join('\n');
  }

  const overrides: Record<string, string> = {};
  for (const part of desc.split(',')) {
    const m = part.trim().match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (m) overrides[m[1]] = `${m[1]} = ${m[2].trim()}`;
  }
  const injected = new Set<string>();
  const studentLines = studentCode.split('\n').map(line => {
    const m = line.match(/^([A-Za-z_]\w*)\s*=/);
    if (m && overrides[m[1]]) { injected.add(m[1]); return overrides[m[1]]; }
    return line;
  });
  const prefix = Object.entries(overrides).filter(([k]) => !injected.has(k)).map(([, v]) => v);
  return [...prefix, ...studentLines].join('\n');
}

// Inlined as a Blob so it is bundled with the app JS and never served from a
// stale CDN/browser cache (see git history on the original two components).
const PYTHON_WORKER_SRC = `
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

// No WASM runtime to load - the browser already runs JS natively, so this
// worker posts 'ready' synchronously and just sandboxes console.log capture
// plus the Worker's own thread/global-scope isolation (same trust level as
// the Pyodide exec() above).
const JS_WORKER_SRC = `
self.onmessage = (e) => {
  const { type, code, runId } = e.data;
  if (type !== 'run') return;
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => {
    logs.push(args.map((a) => (a !== null && typeof a === 'object') ? JSON.stringify(a) : String(a)).join(' '));
  };
  try {
    new Function(code)();
    self.postMessage({ type: 'output', output: logs.join('\\n') || '(no output)', runId });
  } catch (err) {
    self.postMessage({ type: 'error', error: String((err && err.message) || err), runId });
  } finally {
    console.log = originalLog;
  }
};
self.postMessage({ type: 'ready' });
`;

export function createRunnerWorker(language: Language): Worker {
  const src = language === 'python' ? PYTHON_WORKER_SRC : JS_WORKER_SRC;
  const blob = new Blob([src], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

export function runOneTest(
  worker: Worker,
  code: string,
  runId: number,
  timeoutMs = 10000,
): Promise<{ output?: string; error?: string }> {
  return new Promise((resolve) => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data.runId !== runId) return;
      clearTimeout(timeoutId);
      worker.removeEventListener('message', handleMsg);
      if (e.data.type === 'output') resolve({ output: e.data.output });
      else resolve({ error: e.data.error });
    };

    const timeoutId = setTimeout(() => {
      worker.removeEventListener('message', handleMsg);
      resolve({ error: 'Timed out after 10s' });
    }, timeoutMs);

    worker.addEventListener('message', handleMsg);
    worker.postMessage({ type: 'run', code, runId });
  });
}

export async function runTestCases(
  worker: Worker,
  testCases: RunnerTestCase[],
  studentCode: string,
  language: Language,
  nextRunId: () => number,
  timeoutMs = 10000,
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const tc of testCases) {
    const fullCode = composeTestCode(studentCode, tc.description, language);
    const runId = nextRunId();
    const { output, error } = await runOneTest(worker, fullCode, runId, timeoutMs);
    if (error !== undefined) {
      results.push({ id: tc.id, passed: false, actual: '', error });
    } else {
      const actual = normalizeOutput(output || '');
      const expected = normalizeOutput(tc.expected_output);
      results.push({ id: tc.id, passed: actual === expected, actual });
    }
  }
  return results;
}
