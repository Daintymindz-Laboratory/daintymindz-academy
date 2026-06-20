'use client';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

const PROJECT = {
  courseTitle: 'Intro to Machine Learning',
  title: 'Mini Project: Iris Classifier',
  track: 'AI',
  trackColor: '#D59C10',
  lessonNum: 5,
  totalLessons: 5,
};

const STARTER_CODE = `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score
import pandas as pd

# Load data
iris = load_iris()
X, y = iris.data, iris.target

# TODO: Split the data into train and test sets (80/20)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# TODO: Train all three models and compare accuracy
models = {
    "Decision Tree": DecisionTreeClassifier(max_depth=3),
    "KNN":           KNeighborsClassifier(n_neighbors=5),
    "SVM":           SVC(kernel="rbf"),
}

results = {}
for name, model in models.items():
    model.fit(X_train, y_train)
    acc = accuracy_score(y_test, model.predict(X_test))
    results[name] = acc
    print(f"{name}: {acc:.2%}")

# TODO: Print the best model
best = max(results, key=results.get)
print(f"\\nBest model: {best} ({results[best]:.2%})")
`;

const INSTRUCTIONS = [
  {
    step: '01',
    title: 'Load and split the data',
    body: 'The Iris dataset is already loaded. Split it into training (80%) and test (20%) sets using train_test_split with random_state=42 for reproducibility.',
  },
  {
    step: '02',
    title: 'Train three classifiers',
    body: 'Train a Decision Tree, K-Nearest Neighbors, and Support Vector Machine on the training data. Each model uses the same .fit() interface.',
  },
  {
    step: '03',
    title: 'Compare and pick the best',
    body: 'Evaluate each model on the test set using accuracy_score. Print all results and identify which model performs best.',
  },
  {
    step: '04',
    title: 'Run and verify',
    body: 'Click Run Code below. You should see accuracy scores for all three models and the name of the best performer. Then click Submit Project.',
  },
];

export default function ProjectPage() {
  const [code, setCode] = useState(STARTER_CODE);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'instructions' | 'output'>('instructions');
  const workerRef = useRef<Worker | null>(null);
  const runTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const worker = new Worker('/pyodide-worker.js');
    workerRef.current = worker;
    worker.onmessage = (e) => {
      if (e.data.type === 'ready') setPyodideReady(true);
    };
    worker.onerror = (err) => console.error('Pyodide worker error:', err);
    return () => { worker.terminate(); workerRef.current = null; };
  }, []);

  const runCode = () => {
    if (!workerRef.current || !pyodideReady) return;
    setRunning(true);
    setActiveTab('output');
    setOutput('Running...\n');
    if (runTimeoutRef.current) clearTimeout(runTimeoutRef.current);
    const worker = workerRef.current;
    runTimeoutRef.current = setTimeout(() => {
      worker.terminate();
      workerRef.current = null;
      setPyodideReady(false);
      setOutput('Error:\nExecution timed out after 10 seconds. Check for infinite loops.');
      setRunning(false);
    }, 10000);
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'output' || e.data.type === 'error') {
        clearTimeout(runTimeoutRef.current!);
        setOutput(e.data.type === 'error' ? `Error:\n${e.data.error}` : e.data.output);
        setRunning(false);
        worker.removeEventListener('message', handleMessage);
      }
    };
    worker.addEventListener('message', handleMessage);
    worker.postMessage({ type: 'run', code });
  };

  return (
    <div style={{ background: '#1A1D21', height: '100vh', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* TOP NAV */}
      <nav style={{
        height: 56, background: '#1A1D21',
        borderBottom: '1px solid #2A2F35',
        display: 'flex', alignItems: 'center',
        padding: '0 1.25rem', gap: 12,
        flexShrink: 0,
      }}>
        <a href="/catalog" style={{ textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={88} height={32} style={{ objectFit: 'contain' }} />
        </a>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 13, color: '#6B7280' }}>{PROJECT.courseTitle}</span>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 13, color: '#F5F5F5', fontWeight: 500 }}>{PROJECT.title}</span>

        <div style={{ flex: 1 }} />

        {/* Pyodide status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: pyodideReady ? '#4CAF7D' : '#6B7280',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: pyodideReady ? '#4CAF7D' : '#3A3F46',
            boxShadow: pyodideReady ? '0 0 6px #4CAF7D' : 'none',
          }} />
          {pyodideReady ? 'Python ready' : 'Loading Python...'}
        </div>

        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          background: 'rgba(155,111,212,0.1)',
          border: '1px solid rgba(155,111,212,0.2)',
          borderRadius: 20, padding: '4px 12px',
          color: '#9B6FD4',
        }}>PROJECT</div>

        <a href="/lesson" style={{
          color: '#6B7280', fontSize: 13, textDecoration: 'none',
          border: '1px solid #2A2F35', borderRadius: 20, padding: '5px 14px',
        }}>
          Back to lesson
        </a>
      </nav>

      {/* BODY */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

        {/* LEFT: Instructions */}
        <div style={{
          borderRight: '1px solid #2A2F35',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', borderBottom: '1px solid #2A2F35',
            flexShrink: 0,
          }}>
            {(['instructions', 'output'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 20px', background: 'none',
                  border: 'none', borderBottom: activeTab === tab ? '2px solid #D59C10' : '2px solid transparent',
                  color: activeTab === tab ? '#F5F5F5' : '#6B7280',
                  fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                  textTransform: 'capitalize', transition: 'all 0.15s',
                }}
              >
                {tab}
                {tab === 'output' && output && (
                  <span style={{
                    marginLeft: 6, width: 6, height: 6,
                    borderRadius: '50%', background: '#D59C10',
                    display: 'inline-block', verticalAlign: 'middle',
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem' }}>
            {activeTab === 'instructions' ? (
              <>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10, color: '#9B6FD4',
                  letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10,
                }}>
                  Project · Lesson {PROJECT.lessonNum} of {PROJECT.totalLessons}
                </div>
                <h1 style={{
                  fontSize: 22, fontWeight: 700, color: '#F5F5F5',
                  lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.02em',
                }}>
                  {PROJECT.title}
                </h1>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.75, marginBottom: '2rem' }}>
                  Apply everything you have learned in this course. Build a complete ML pipeline, compare three classifiers, and identify the best performer on the Iris dataset.
                </p>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: '2rem' }}>
                  {INSTRUCTIONS.map(inst => (
                    <div key={inst.step} style={{
                      display: 'flex', gap: 16, alignItems: 'flex-start',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: 'rgba(213,156,16,0.1)',
                        border: '1px solid rgba(213,156,16,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10, fontWeight: 700, color: '#D59C10',
                      }}>{inst.step}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#F5F5F5', marginBottom: 4 }}>
                          {inst.title}
                        </div>
                        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
                          {inst.body}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Expected output box */}
                <div style={{
                  background: '#22262B', border: '1px solid #2A2F35',
                  borderRadius: 14, padding: '14px 18px', marginBottom: '2rem',
                }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10, color: '#3A3F46',
                    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10,
                  }}>Expected output</div>
                  <pre style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12, color: '#6B7280', lineHeight: 1.7, margin: 0,
                  }}>{`Decision Tree: 100.00%
KNN:           100.00%
SVM:           100.00%

Best model: Decision Tree (100.00%)`}</pre>
                </div>
              </>
            ) : (
              <div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10, color: '#3A3F46',
                  letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14,
                }}>Output</div>
                {output ? (
                  <pre style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13, color: '#4CAF7D', lineHeight: 1.75,
                    background: '#22262B', border: '1px solid #2A2F35',
                    borderRadius: 14, padding: '16px 18px', margin: 0,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>{output}</pre>
                ) : (
                  <div style={{
                    color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12, padding: '2rem 0',
                  }}>
                    {'// run your code to see output here'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #2A2F35',
            display: 'flex', gap: 10, flexShrink: 0,
          }}>
            <button
              onClick={runCode}
              disabled={running || !pyodideReady}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 50,
                background: running ? '#22262B' : '#D59C10',
                border: running ? '1px solid #3A3F46' : 'none',
                color: running ? '#6B7280' : '#1A1D21',
                fontSize: 14, fontWeight: 700, cursor: running || !pyodideReady ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
              }}
            >
              {running ? 'Running...' : pyodideReady ? 'Run Code' : 'Loading Python...'}
            </button>
            <button
              onClick={() => setSubmitted(true)}
              disabled={!output || submitted}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 50,
                background: submitted ? 'rgba(76,175,125,0.1)' : 'transparent',
                border: submitted ? '1px solid rgba(76,175,125,0.3)' : '1px solid #3A3F46',
                color: submitted ? '#4CAF7D' : output ? '#F5F5F5' : '#3A3F46',
                fontSize: 14, fontWeight: 700,
                cursor: !output || submitted ? 'not-allowed' : 'pointer',
                fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
              }}
            >
              {submitted ? 'Submitted!' : 'Submit Project'}
            </button>
          </div>
        </div>

        {/* RIGHT: Monaco Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Editor header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px',
            background: '#1A1D21', borderBottom: '1px solid #2A2F35',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3A3F46' }} />
              </div>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12, color: '#6B7280', marginLeft: 8,
              }}>iris_classifier.py</span>
            </div>
            <button
              onClick={() => setCode(STARTER_CODE)}
              style={{
                background: 'transparent', border: '1px solid #2A2F35',
                borderRadius: 20, padding: '4px 12px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, color: '#6B7280', cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>

          {/* Monaco */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={val => setCode(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: 'JetBrains Mono, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                padding: { top: 16, bottom: 16 },
                wordWrap: 'on',
                tabSize: 4,
                automaticLayout: true,
              }}
            />
          </div>




        </div>
      </div>
    </div>
  );
}