'use client';
import Image from 'next/image';
import { useState } from 'react';

const COURSE = {
  title: 'Intro to Machine Learning',
  track: 'AI',
  trackColor: '#D59C10',
};

const LESSONS = [
  { id: 1, title: 'What is Machine Learning?', duration: '12 min', completed: true },
  { id: 2, title: 'Types of ML: Supervised, Unsupervised & RL', duration: '15 min', completed: true },
  { id: 3, title: 'Your First Model with scikit-learn', duration: '20 min', completed: false, current: true },
  { id: 4, title: 'Model Evaluation Metrics', duration: '18 min', completed: false },
  { id: 5, title: 'Mini Project: Iris Classifier', duration: '30 min', completed: false, isProject: true },
];

const LESSON_CONTENT = [
  {
    id: 1,
    title: 'What is Machine Learning?',
    sections: [
      {
        heading: 'Defining machine learning',
        body: 'Machine Learning (ML) is a subfield of artificial intelligence that gives computers the ability to learn from data without being explicitly programmed for every task. Instead of writing rules manually, we train a model on examples and let it discover patterns.',
      },
      {
        heading: 'The classic definition',
        body: 'Tom Mitchell (1997) defined it as: a computer program is said to learn from experience E with respect to task T and performance measure P, if its performance on T improves with experience E.',
      },
      {
        heading: 'Why it matters',
        body: 'Traditional programming requires explicit rules. ML inverts this — you provide data and desired outputs, and the algorithm learns the rules. This is powerful for tasks where rules are too complex or unknown, such as recognising faces, translating languages, or detecting fraud.',
      },
    ],
    callout: {
      type: 'info',
      text: 'Machine learning is not magic — it is pattern recognition at scale. Every ML model is only as good as the data it learns from.',
    },
    code: {
      language: 'python',
      label: 'ml_intro.py',
      content: `# The three ingredients of ML

# 1. Data
data = [
    {"hours_studied": 2, "passed": False},
    {"hours_studied": 5, "passed": True},
    {"hours_studied": 8, "passed": True},
]

# 2. Model (a simple threshold rule)
def predict(hours):
    return hours >= 4

# 3. Evaluation
correct = sum(
    1 for d in data
    if predict(d["hours_studied"]) == d["passed"]
)
accuracy = correct / len(data)
print(f"Accuracy: {accuracy:.0%}")
# Output: Accuracy: 100%`,
    },
  },
  {
    id: 2,
    title: 'Types of ML: Supervised, Unsupervised & RL',
    sections: [
      {
        heading: 'Supervised learning',
        body: 'The model learns from labelled examples — input-output pairs. Given enough examples it learns to map new inputs to correct outputs. Common tasks: classification (spam or not spam) and regression (predicting house prices).',
      },
      {
        heading: 'Unsupervised learning',
        body: 'No labels. The model finds hidden structure in unlabelled data — groupings, patterns, anomalies. Common tasks: clustering (customer segments), dimensionality reduction, anomaly detection.',
      },
      {
        heading: 'Reinforcement learning',
        body: 'An agent takes actions in an environment to maximise cumulative reward. No fixed dataset — only feedback signals. Used in game-playing AIs, robotic control, and recommendation systems.',
      },
    ],
    callout: {
      type: 'tip',
      text: 'Most real-world AI products use supervised learning. Start there before exploring the others.',
    },
    code: {
      language: 'python',
      label: 'ml_types.py',
      content: `# Supervised — labelled data
from sklearn.linear_model import LogisticRegression

X = [[2], [5], [8], [1], [7]]  # hours studied
y = [0,   1,   1,  0,   1]    # passed (0=No, 1=Yes)

model = LogisticRegression()
model.fit(X, y)
print(model.predict([[6]]))  # [1] → will pass

# Unsupervised — no labels
from sklearn.cluster import KMeans

data = [[2], [2.5], [8], [8.5], [5]]
km = KMeans(n_clusters=2, random_state=42)
km.fit(data)
print(km.labels_)  # [0, 0, 1, 1, ?]`,
    },
  },
  {
    id: 3,
    title: 'Your First Model with scikit-learn',
    sections: [
      {
        heading: 'Installing scikit-learn',
        body: 'scikit-learn is the most popular Python library for classical machine learning. It provides consistent APIs for dozens of algorithms and works seamlessly with NumPy and pandas.',
      },
      {
        heading: 'The Iris dataset',
        body: 'We will use the built-in Iris dataset — 150 flower samples with 4 features (sepal length, sepal width, petal length, petal width) and 3 class labels (setosa, versicolor, virginica). It is clean, small, and perfect for learning.',
      },
      {
        heading: 'Train, evaluate, predict',
        body: 'The standard workflow is always the same: load data, split into train/test sets, fit a model on training data, evaluate on test data, then predict on new data. This workflow applies to every ML algorithm you will ever use.',
      },
    ],
    callout: {
      type: 'success',
      text: 'You are about to train your first real ML model. The code on the right runs a Decision Tree that achieves 100% accuracy on the Iris test set.',
    },
    code: {
      language: 'python',
      label: 'first_model.py',
      content: `from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

# 1. Load data
iris = load_iris()
X, y = iris.data, iris.target

# 2. Split — 80% train, 20% test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 3. Train
model = DecisionTreeClassifier(max_depth=3)
model.fit(X_train, y_train)

# 4. Evaluate
preds = model.predict(X_test)
acc = accuracy_score(y_test, preds)
print(f"Test accuracy: {acc:.2%}")
# Output: Test accuracy: 100.00%

# 5. Predict on new sample
new_flower = [[5.1, 3.5, 1.4, 0.2]]
print(iris.target_names[model.predict(new_flower)[0]])
# Output: setosa`,
    },
  },
  {
    id: 4,
    title: 'Model Evaluation Metrics',
    sections: [
      {
        heading: 'Why accuracy alone is not enough',
        body: 'If 99% of emails are not spam, a model that always predicts "not spam" achieves 99% accuracy but is completely useless. We need richer evaluation metrics that capture different failure modes.',
      },
      {
        heading: 'Precision and recall',
        body: 'Precision answers: of all positive predictions, how many were actually positive? Recall answers: of all actual positives, how many did the model find? There is always a trade-off between the two depending on your use case.',
      },
      {
        heading: 'F1 score and ROC-AUC',
        body: 'F1 is the harmonic mean of precision and recall — useful when you need a single balanced metric. ROC-AUC measures the model\'s ability to distinguish between classes across all thresholds. Higher is always better for both.',
      },
    ],
    callout: {
      type: 'info',
      text: 'Always choose your evaluation metric based on the cost of false positives vs false negatives in your specific problem.',
    },
    code: {
      language: 'python',
      label: 'evaluation.py',
      content: `from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report
)

y_true = [1, 0, 1, 1, 0, 1, 0, 0, 1, 0]
y_pred = [1, 0, 1, 0, 0, 1, 1, 0, 1, 0]

print(f"Accuracy:  {accuracy_score(y_true, y_pred):.2f}")
print(f"Precision: {precision_score(y_true, y_pred):.2f}")
print(f"Recall:    {recall_score(y_true, y_pred):.2f}")
print(f"F1 Score:  {f1_score(y_true, y_pred):.2f}")

# Full report
print(classification_report(y_true, y_pred))`,
    },
  },
  {
    id: 5,
    title: 'Mini Project: Iris Classifier',
    sections: [
      {
        heading: 'Your mission',
        body: 'Build a complete ML pipeline from scratch. You will load the Iris dataset, explore it with pandas, train three different classifiers, compare their performance, and pick the best one. Then save it for deployment.',
      },
      {
        heading: 'What you will submit',
        body: 'A Python script that outputs a comparison table of all three models, prints the best model name and its test accuracy, and saves the winning model using joblib. Run the code on the right to complete the project.',
      },
      {
        heading: 'Completing this project',
        body: 'Once you run the code and see the output, click Mark Complete below. This will unlock your Intro to Machine Learning certificate and mark the course as finished on your dashboard.',
      },
    ],
    callout: {
      type: 'success',
      text: 'This is a graded project. Run the code, verify the output, then click Mark Complete to earn your certificate.',
    },
    code: {
      language: 'python',
      label: 'iris_project.py',
      content: `import pandas as pd
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score
import joblib

# Load and explore
iris = load_iris()
df = pd.DataFrame(iris.data, columns=iris.feature_names)
df['species'] = iris.target_names[iris.target]
print(df.head())

# Split
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target,
    test_size=0.2, random_state=42
)

# Train three models
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

# Best model
best_name = max(results, key=results.get)
print(f"\nBest model: {best_name} ({results[best_name]:.2%})")

# Save
joblib.dump(models[best_name], "iris_model.pkl")
print("Model saved to iris_model.pkl")`,
    },
  },
];

function CodeBlock({ code }: { code: typeof LESSON_CONTENT[0]['code'] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlighted = code.content
    .replace(/^(#.*)$/gm, '<span style="color:#6B7280">$1</span>')
    .replace(/\b(from|import|def|class|return|print|if|else|for|in|True|False|None|and|or|not)\b/g, '<span style="color:#C084FC">$1</span>')
    .replace(/\b(fit|predict|transform|score|append|join|format|get|set|len|sum|max|min)\b/g, '<span style="color:#60A5FA">$1</span>')
    .replace(/(["'`])(.*?)\1/g, '<span style="color:#86EFAC">$1$2$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#FCA5A5">$1</span>');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Code header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px',
        background: '#1A1D21',
        borderBottom: '1px solid #2A2F35',
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
          }}>{code.label}</span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? 'rgba(76,175,125,0.15)' : 'rgba(213,156,16,0.1)',
            border: copied ? '1px solid rgba(76,175,125,0.3)' : '1px solid rgba(213,156,16,0.2)',
            borderRadius: 20, padding: '4px 14px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11, color: copied ? '#4CAF7D' : '#D59C10',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '20px 20px',
        background: '#1A1D21',
      }}>
        <pre style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13, lineHeight: 1.75,
          color: '#E5E7EB', margin: 0,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>

      {/* Language tag */}
      <div style={{
        padding: '8px 18px',
        borderTop: '1px solid #2A2F35',
        background: '#1A1D21',
        display: 'flex', justifyContent: 'flex-end',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10, color: '#3A3F46',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>Python</span>
      </div>
    </div>
  );
}

export default function LessonPage() {
  const [currentLessonId, setCurrentLessonId] = useState(3);
  const [completedIds, setCompletedIds] = useState<number[]>([1, 2]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const currentLesson = LESSON_CONTENT.find(l => l.id === currentLessonId)!;
  const currentIdx = LESSONS.findIndex(l => l.id === currentLessonId);
  const prevLesson = LESSONS[currentIdx - 1];
  const nextLesson = LESSONS[currentIdx + 1];
  const isCompleted = completedIds.includes(currentLessonId);
  const isProject = LESSONS.find(l => l.id === currentLessonId)?.isProject;

  const markComplete = () => {
    if (!completedIds.includes(currentLessonId)) {
      setCompletedIds(prev => [...prev, currentLessonId]);
    }
    if (nextLesson) setCurrentLessonId(nextLesson.id);
  };

  const calloutStyles: Record<string, { bg: string; border: string; color: string; icon: string }> = {
    info: { bg: 'rgba(78,143,212,0.08)', border: 'rgba(78,143,212,0.3)', color: '#4E8FD4', icon: 'ℹ' },
    tip: { bg: 'rgba(213,156,16,0.08)', border: 'rgba(213,156,16,0.3)', color: '#D59C10', icon: '◆' },
    success: { bg: 'rgba(76,175,125,0.08)', border: 'rgba(76,175,125,0.3)', color: '#4CAF7D', icon: '✓' },
  };

  return (
    <div style={{ background: '#1A1D21', height: '100vh', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* TOP NAV */}
      <nav style={{
        height: 56, background: '#1A1D21',
        borderBottom: '1px solid #2A2F35',
        display: 'flex', alignItems: 'center',
        padding: '0 1.25rem', gap: 12,
        flexShrink: 0, zIndex: 50,
      }}>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 18, padding: 4 }}
        >☰</button>
        <a href="/catalog" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={88} height={32} style={{ objectFit: 'contain' }} />
        </a>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 13, color: '#6B7280' }}>{COURSE.title}</span>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 13, color: '#F5F5F5', fontWeight: 500 }}>{currentLesson.title}</span>
        <div style={{ flex: 1 }} />
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          color: '#6B7280',
        }}>
          {completedIds.length}/{LESSONS.length} complete
        </div>
        <div style={{
          width: 120, height: 4, background: '#2A2F35', borderRadius: 10, overflow: 'hidden',
        }}>
          <div style={{
            width: `${(completedIds.length / LESSONS.length) * 100}%`,
            height: '100%', background: '#D59C10', borderRadius: 10,
            transition: 'width 0.4s',
          }} />
        </div>
        <a href="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: '#6B7280', fontSize: 13, textDecoration: 'none',
          border: '1px solid #2A2F35', borderRadius: 20,
          padding: '5px 14px',
        }}>
          Dashboard
        </a>
      </nav>

      {/* BODY */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LESSON SIDEBAR */}
        {sidebarOpen && (
          <aside style={{
            width: 260, background: '#1A1D21',
            borderRight: '1px solid #2A2F35',
            display: 'flex', flexDirection: 'column',
            flexShrink: 0, overflowY: 'auto',
          }}>
            <div style={{ padding: '1.25rem 1rem 0.75rem', borderBottom: '1px solid #2A2F35' }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, color: '#3A3F46',
                letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6,
              }}>Course content</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#F5F5F5', lineHeight: 1.3 }}>{COURSE.title}</div>
            </div>
            <div style={{ padding: '0.75rem 0' }}>
              {LESSONS.map((lesson, idx) => {
                const isDone = completedIds.includes(lesson.id);
                const isCurrent = lesson.id === currentLessonId;
                return (
                  <div
                    key={lesson.id}
                    onClick={() => setCurrentLessonId(lesson.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px', cursor: 'pointer',
                      background: isCurrent ? 'rgba(213,156,16,0.06)' : 'transparent',
                      borderLeft: isCurrent ? `3px solid #D59C10` : '3px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: isDone ? 'rgba(76,175,125,0.15)' : isCurrent ? 'rgba(213,156,16,0.15)' : '#22262B',
                      border: isDone ? '1px solid rgba(76,175,125,0.4)' : isCurrent ? '1px solid rgba(213,156,16,0.4)' : '1px solid #3A3F46',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                      color: isDone ? '#4CAF7D' : isCurrent ? '#D59C10' : '#3A3F46',
                    }}>
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: isCurrent ? 600 : 400,
                        color: isCurrent ? '#F5F5F5' : isDone ? '#6B7280' : '#F5F5F5',
                        lineHeight: 1.35, marginBottom: 3,
                      }}>{lesson.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>{lesson.duration}</span>
                        {lesson.isProject && (
                          <span style={{
                            fontSize: 9, color: '#9B6FD4',
                            background: 'rgba(155,111,212,0.1)',
                            border: '1px solid rgba(155,111,212,0.2)',
                            borderRadius: 10, padding: '1px 7px',
                            fontFamily: 'JetBrains Mono, monospace',
                            letterSpacing: '0.08em',
                          }}>PROJECT</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* SPLIT SCREEN */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>

          {/* LEFT — Content */}
          <div style={{
            borderRight: '1px solid #2A2F35',
            overflowY: 'auto', padding: '2.5rem 2.5rem 2rem',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Lesson header */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 10, color: '#D59C10',
                letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10,
              }}>
                Lesson {currentIdx + 1} of {LESSONS.length}
              </div>
              <h1 style={{
                fontSize: 24, fontWeight: 700, color: '#F5F5F5',
                lineHeight: 1.2, marginBottom: 8, letterSpacing: '-0.02em',
              }}>
                {currentLesson.title}
              </h1>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>
                  {LESSONS.find(l => l.id === currentLessonId)?.duration}
                </span>
                <span style={{ fontSize: 12, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>
                  Reading + Code
                </span>
              </div>
            </div>

            {/* Sections */}
            {currentLesson.sections.map((section, i) => (
              <div key={i} style={{ marginBottom: '1.75rem' }}>
                <h2 style={{
                  fontSize: 16, fontWeight: 700, color: '#F5F5F5',
                  marginBottom: 10, letterSpacing: '-0.01em',
                }}>{section.heading}</h2>
                <p style={{
                  fontSize: 15, color: '#9CA3AF', lineHeight: 1.8,
                }}>{section.body}</p>
              </div>
            ))}

            {/* Callout */}
            {currentLesson.callout && (() => {
              const cs = calloutStyles[currentLesson.callout.type];
              return (
                <div style={{
                  background: cs.bg,
                  border: `1px solid ${cs.border}`,
                  borderRadius: 14, padding: '14px 18px',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  marginBottom: '2rem',
                }}>
                  <span style={{ color: cs.color, fontSize: 16, flexShrink: 0, marginTop: 1 }}>{cs.icon}</span>
                  <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7, margin: 0 }}>
                    {currentLesson.callout.text}
                  </p>
                </div>
              );
            })()}

            {/* Nav buttons */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 'auto', paddingTop: '2rem',
              borderTop: '1px solid #2A2F35',
            }}>
              <button
                onClick={() => prevLesson && setCurrentLessonId(prevLesson.id)}
                disabled={!prevLesson}
                style={{
                  padding: '10px 22px', borderRadius: 50,
                  background: 'transparent',
                  border: '1px solid #2A2F35',
                  color: prevLesson ? '#F5F5F5' : '#3A3F46',
                  fontSize: 13, fontWeight: 500, cursor: prevLesson ? 'pointer' : 'not-allowed',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Previous
              </button>

              <button
                onClick={markComplete}
                style={{
                  padding: '10px 28px', borderRadius: 50,
                  background: isCompleted ? 'rgba(76,175,125,0.1)' : '#D59C10',
                  border: isCompleted ? '1px solid rgba(76,175,125,0.3)' : 'none',
                  color: isCompleted ? '#4CAF7D' : '#1A1D21',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                }}
              >
                {isCompleted ? 'Completed' : isProject ? 'Mark Complete + Earn Certificate' : nextLesson ? 'Mark Complete' : 'Finish Course'}
              </button>

              <button
                onClick={() => nextLesson && setCurrentLessonId(nextLesson.id)}
                disabled={!nextLesson}
                style={{
                  padding: '10px 22px', borderRadius: 50,
                  background: 'transparent',
                  border: '1px solid #2A2F35',
                  color: nextLesson ? '#F5F5F5' : '#3A3F46',
                  fontSize: 13, fontWeight: 500, cursor: nextLesson ? 'pointer' : 'not-allowed',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Next
              </button>
            </div>
          </div>

          {/* RIGHT — Code */}
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <CodeBlock code={currentLesson.code} />
          </div>
        </div>
      </div>
    </div>
  );
}