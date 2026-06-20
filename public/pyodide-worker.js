/* Pyodide Web Worker — runs Python in an isolated thread with timeout support */
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
  const { type, code } = e.data;

  if (type === 'run') {
    if (!pyodide) {
      self.postMessage({ type: 'error', error: 'Pyodide not loaded yet.' });
      return;
    }
    try {
      outputBuffer = '';
      pyodide.globals.set('print', (...args) => {
        outputBuffer += args.join(' ') + '\n';
      });

      // Load any packages imported in the code
      try {
        await pyodide.loadPackagesFromImports(code);
      } catch (_) {
        // Ignore package load failures for unknown imports
      }

      await pyodide.runPythonAsync(code);
      self.postMessage({ type: 'output', output: outputBuffer || '(no output)' });
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err.message || err) });
    }
  }
};

init().catch(err => {
  self.postMessage({ type: 'error', error: 'Failed to load Python runtime: ' + err.message });
});
