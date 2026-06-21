'use client';
import { useState, useEffect } from 'react';

interface QuizQuestion {
  id: number;
  lesson_id: number;
  order_index: number;
  question_text: string;
  question_type: 'multiple_choice' | 'code_output';
  options: string[];
  correct_answer: string;
  explanation: string | null;
}

interface Props {
  lessonId: number;
  userId: string;
  trackColor: string;
  isCompleted: boolean;
  onComplete: () => void;
}

export default function QuizLesson({ lessonId, userId, trackColor, isCompleted, onComplete }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index');
      setQuestions(
        (data || []).map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]'),
        }))
      );
      setLoading(false);
    };
    load();
  }, [lessonId]);

  const submit = async () => {
    if (saving) return;
    const correct = questions.filter(q => answers[q.id] === q.correct_answer).length;
    const total = questions.length;
    const didPass = total > 0 && Math.round((correct / total) * 100) >= 70;
    setScore(correct);
    setPassed(didPass);
    setSubmitted(true);
    setSaving(true);

    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    await supabase.from('quiz_scores').insert({
      user_id: userId, lesson_id: lessonId,
      score: correct, total, passed: didPass,
    });
    setSaving(false);
    if (didPass) onComplete();
  };

  const retry = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setPassed(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
        Loading quiz...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
        No questions have been added to this quiz yet.
      </div>
    );
  }

  const allAnswered = questions.every(q => answers[q.id]);
  const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 720, margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: trackColor,
          letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8,
        }}>Quiz</div>
        <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
          Answer all {questions.length} questions. You need 70% or higher to pass.
        </p>
      </div>

      {submitted && (
        <div style={{
          padding: '20px 24px', borderRadius: 14, marginBottom: '2rem',
          background: passed ? 'rgba(76,175,125,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${passed ? 'rgba(76,175,125,0.3)' : 'rgba(248,113,113,0.3)'}`,
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: passed ? '#4CAF7D' : '#F87171', marginBottom: 6 }}>
            {passed ? 'Quiz Passed!' : 'Not quite.'}
          </div>
          <div style={{ fontSize: 14, color: '#9CA3AF' }}>
            You scored {score}/{questions.length} ({pct}%).
            {!passed && ' You need 70% to pass. Review the answers below and try again.'}
          </div>
          {!passed && (
            <button onClick={retry} style={{
              marginTop: 14, padding: '8px 22px', borderRadius: 50,
              background: 'transparent', border: '1px solid #3A3F46',
              color: '#F5F5F5', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}>Try Again</button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          const isCorrect = submitted ? userAnswer === q.correct_answer : null;

          return (
            <div key={q.id} style={{
              background: submitted
                ? isCorrect ? 'rgba(76,175,125,0.04)' : 'rgba(248,113,113,0.04)'
                : '#22262B',
              border: `1px solid ${submitted
                ? isCorrect ? 'rgba(76,175,125,0.2)' : 'rgba(248,113,113,0.2)'
                : '#2A2F35'}`,
              borderRadius: 14, padding: '20px 24px',
            }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: submitted
                    ? isCorrect ? 'rgba(76,175,125,0.15)' : 'rgba(248,113,113,0.15)'
                    : `${trackColor}15`,
                  border: `1px solid ${submitted
                    ? isCorrect ? 'rgba(76,175,125,0.4)' : 'rgba(248,113,113,0.4)'
                    : `${trackColor}40`}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
                  color: submitted ? (isCorrect ? '#4CAF7D' : '#F87171') : trackColor,
                }}>
                  {submitted ? (isCorrect ? '✓' : '✗') : idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  {q.question_type === 'code_output' ? (
                    <pre style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                      color: '#E5E7EB', background: '#0D1117', borderRadius: 8,
                      padding: '12px 16px', border: '1px solid #2A2F35',
                      margin: '0 0 4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>{q.question_text}</pre>
                  ) : (
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#F5F5F5', lineHeight: 1.5, margin: 0 }}>
                      {q.question_text}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 40 }}>
                {q.options.map((opt, oi) => {
                  const selected = userAnswer === opt;
                  const isRight = submitted && opt === q.correct_answer;
                  const isWrong = submitted && selected && !isRight;
                  return (
                    <label key={oi} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      cursor: submitted ? 'default' : 'pointer',
                      padding: '10px 14px', borderRadius: 10, transition: 'all 0.15s',
                      background: isRight ? 'rgba(76,175,125,0.08)' : isWrong ? 'rgba(248,113,113,0.08)' : selected ? `${trackColor}08` : 'transparent',
                      border: `1px solid ${isRight ? 'rgba(76,175,125,0.3)' : isWrong ? 'rgba(248,113,113,0.3)' : selected ? `${trackColor}30` : '#2A2F35'}`,
                    }}>
                      <input
                        type="radio"
                        name={`q_${q.id}`}
                        value={opt}
                        checked={selected}
                        disabled={submitted}
                        onChange={() => !submitted && setAnswers(a => ({ ...a, [q.id]: opt }))}
                        style={{ marginTop: 2, accentColor: trackColor }}
                      />
                      <span style={{
                        fontSize: 14, lineHeight: 1.5,
                        color: isRight ? '#4CAF7D' : isWrong ? '#F87171' : selected ? '#F5F5F5' : '#9CA3AF',
                      }}>{opt}</span>
                      {isRight && (
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4CAF7D', flexShrink: 0 }}>Correct</span>
                      )}
                    </label>
                  );
                })}
              </div>

              {submitted && q.explanation && (
                <div style={{
                  marginTop: 14, paddingLeft: 40,
                  fontSize: 13, color: '#6B7280', lineHeight: 1.6,
                  borderTop: '1px solid #2A2F35', paddingTop: 12,
                }}>
                  <span style={{ color: '#D59C10', fontWeight: 600 }}>Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={submit} disabled={!allAnswered || saving} style={{
            padding: '11px 32px', borderRadius: 50,
            background: allAnswered ? trackColor : '#3A3F46', border: 'none',
            color: allAnswered ? '#1A1D21' : '#6B7280',
            fontSize: 14, fontWeight: 700,
            cursor: allAnswered ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            {saving ? 'Submitting...' : `Submit Quiz (${Object.keys(answers).length}/${questions.length} answered)`}
          </button>
        </div>
      )}

      {submitted && passed && isCompleted && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: 13, color: '#4CAF7D' }}>
          Quiz passed and marked complete.
        </div>
      )}
    </div>
  );
}
