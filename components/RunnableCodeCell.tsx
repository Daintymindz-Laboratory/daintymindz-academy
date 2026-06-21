'use client';
import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Props {
  initialCode: string;
  workerRef: React.MutableRefObject<Worker | null>;
  pyodideReady: boolean;
}

export default function RunnableCodeCell({ initialCode, workerRef, pyodideReady }: Props) {
  const [code, setCode] = useState(initialCode.trim());
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const runIdRef = useRef(0);

  const run = useCallback(() => {
    if (!workerRef.current || !pyodideReady || running) return;
    const id = ++runIdRef.current;
    setRunning(true);
    setShowOutput(true);
    setOutput('Running...');

    const timeoutId = setTimeout(() => {
      setOutput('Error: Execution timed out after 10 seconds.');
      setRunning(false);
    }, 10000);

    const handleMsg = (e: MessageEvent) => {
      if (e.data.runId !== id) return;
      clearTimeout(timeoutId);
      workerRef.current?.removeEventListener('message', handleMsg);
      if (e.data.type === 'output') setOutput(e.data.output);
      else if (e.data.type === 'error') setOutput(`Error:\n${e.data.error}`);
      setRunning(false);
    };

    workerRef.current.addEventListener('message', handleMsg);
    workerRef.current.postMessage({ type: 'run', code, runId: id });
  }, [code, pyodideReady, running, workerRef]);

  const lineCount = code.split('\n').length;
  const editorHeight = Math.min(Math.max(lineCount * 20 + 24, 80), 320);
  const isError = output.startsWith('Error');

  return (
    <div style={{
      margin: '1.5rem 0', border: '1px solid #2A2F35',
      borderRadius: 12, overflow: 'hidden', background: '#0D1117',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', background: '#161B22', borderBottom: '1px solid #2A2F35',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3A3F46' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3A3F46' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3A3F46' }} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B7280' }}>python</span>
          <span style={{
            fontSize: 10, padding: '1px 8px', borderRadius: 20,
            background: 'rgba(213,156,16,0.1)', color: '#D59C10',
            fontFamily: 'JetBrains Mono, monospace',
          }}>interactive</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setCode(initialCode.trim())} style={{
            background: 'transparent', border: '1px solid #3A3F46', borderRadius: 20,
            padding: '3px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            color: '#6B7280', cursor: 'pointer',
          }}>Reset</button>
          <button onClick={run} disabled={running || !pyodideReady} style={{
            background: running ? '#22262B' : '#D59C10',
            border: running ? '1px solid #3A3F46' : 'none',
            borderRadius: 20, padding: '3px 14px',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            color: running ? '#6B7280' : '#1A1D21',
            cursor: running || !pyodideReady ? 'not-allowed' : 'pointer', fontWeight: 700,
          }}>
            {running ? 'Running...' : pyodideReady ? 'Run' : 'Loading...'}
          </button>
        </div>
      </div>

      <Editor
        height={editorHeight}
        language="python"
        value={code}
        onChange={val => setCode(val || '')}
        theme="vs-dark"
        options={{
          fontSize: 13, fontFamily: 'JetBrains Mono, monospace',
          minimap: { enabled: false }, scrollBeyondLastLine: false,
          lineNumbers: 'on', padding: { top: 12, bottom: 12 },
          wordWrap: 'on', tabSize: 4, automaticLayout: true,
          scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
          overviewRulerLanes: 0,
        }}
      />

      {showOutput && (
        <div style={{ borderTop: '1px solid #2A2F35' }}>
          <div style={{
            padding: '8px 14px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#3A3F46', letterSpacing: '0.1em', textTransform: 'uppercase' }}>output</span>
            <button onClick={() => setShowOutput(false)} style={{
              background: 'none', border: 'none', color: '#3A3F46', cursor: 'pointer', fontSize: 14, padding: 0,
            }}>x</button>
          </div>
          <pre style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
            color: isError ? '#F87171' : '#4CAF7D',
            lineHeight: 1.7, padding: '4px 14px 12px', margin: 0,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            maxHeight: 200, overflowY: 'auto',
          }}>{output}</pre>
        </div>
      )}
    </div>
  );
}
