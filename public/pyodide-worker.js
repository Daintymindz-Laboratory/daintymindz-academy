/* Pyodide Web Worker: runs Python in an isolated thread with timeout support.
   Each message can include a runId so multiple callers can match responses. */
let pyodide = null;
let outputBuffer = '';

self.importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

async function init() {
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
  });
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
      outputBuffer = '';

      // Fresh namespace per run so variables never leak between test cases.
      const ns = pyodide.globals.get('dict')();
      ns.set('print', (...args) => {
        outputBuffer += args.join(' ') + '\n';
      });

      try {
        await pyodide.loadPackagesFromImports(code);
      } catch (_) {}

      await pyodide.runPythonAsync(code, { globals: ns });
      ns.destroy();
      self.postMessage({ type: 'output', output: outputBuffer || '(no output)', runId });
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err.message || err), runId });
    }
  }
};

init().catch(err => {
  self.postMessage({ type: 'error', error: 'Failed to load Python runtime: ' + err.message });
});
