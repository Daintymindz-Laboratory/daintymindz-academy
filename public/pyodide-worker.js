/* Pyodide Web Worker: runs Python in an isolated thread with timeout support.
   Each message can include a runId so multiple callers can match responses. */
let pyodide = null;

self.importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

async function init() {
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
  });
  // Set up sys and io once at init time.
  pyodide.runPython('import sys, io');
  self.postMessage({ type: 'ready' });
}

self.onmessage = async (e) => {
  const { type, code, runId } = e.data;

  if (type === 'run') {
    if (!pyodide) {
      self.postMessage({ type: 'error', error: 'Pyodide not loaded yet.', runId });
      return;
    }
    try {
      // Clear any user-defined variables from the previous test run so state
      // never leaks between test cases. Preserve names starting with '_' (our
      // internal vars) and 'sys'/'io' which we imported at init.
      pyodide.runPython(
        "for _k in [k for k in list(globals()) if not k.startswith('_') and k not in ('sys','io')]: del globals()[_k]"
      );

      // Redirect Python stdout to a StringIO buffer so we capture print output.
      pyodide.runPython('_buf = io.StringIO(); _prev_stdout = sys.stdout; sys.stdout = _buf');

      try { await pyodide.loadPackagesFromImports(code); } catch (_) {}

      await pyodide.runPythonAsync(code);

      // Grab captured output and restore stdout before we return.
      const output = pyodide.runPython('sys.stdout = _prev_stdout; _buf.getvalue()');
      self.postMessage({ type: 'output', output: output || '(no output)', runId });
    } catch (err) {
      try { pyodide.runPython('sys.stdout = _prev_stdout'); } catch (_) {}
      self.postMessage({ type: 'error', error: String(err.message || err), runId });
    }
  }
};

init().catch(err => {
  self.postMessage({ type: 'error', error: 'Failed to load Python runtime: ' + err.message });
});
