'use client';
import { useMemo, useRef, useState } from 'react';
import {
  COURSE_IMPORT_GUIDE,
  TEMPLATE_BUNDLE,
  downloadJson,
  importCourseBundle,
  parseCourseBundle,
  type ImportResult,
} from '@/lib/courseImport';

type CourseOption = { id?: number; title: string };
type AdminOption = { id: string; full_name: string; position: string | null };

type Props = {
  trackCodes: string[];
  courses: CourseOption[];
  adminProfiles: AdminOption[];
  currentAdminId: string;
  onClose: () => void;
  onImported: (result: ImportResult) => void;
};

const TYPE_COLORS: Record<string, string> = {
  project: '#9B6FD4', quiz: '#4E8FD4', mini_project: '#E86F4E',
  assessment: '#4E8FD4', discussion: '#42B8A6', lesson: '#D59C10',
};

const panel = {
  background: '#1A1D21', border: '1px solid #3A3F46',
  borderRadius: 14, padding: '14px 16px',
};

const label = {
  display: 'block' as const, fontSize: 11, fontWeight: 600 as const,
  color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase' as const,
  marginBottom: 6, fontFamily: 'JetBrains Mono, monospace',
};

const input = {
  width: '100%', height: 42, background: '#22262B', border: '1px solid #3A3F46',
  borderRadius: 10, padding: '0 14px', fontSize: 14, color: '#F5F5F5',
  fontFamily: 'DM Sans, sans-serif', outline: 'none',
};

export default function CourseImportModal({
  trackCodes, courses, adminProfiles, currentAdminId, onClose, onImported,
}: Props) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<'new' | 'append'>('new');
  const [targetCourseId, setTargetCourseId] = useState<number | ''>(courses[0]?.id ?? '');
  const [publish, setPublish] = useState<'file' | 'all' | 'none'>('file');
  const [instructorIds, setInstructorIds] = useState<string[]>(currentAdminId ? [currentAdminId] : []);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [failure, setFailure] = useState('');
  const [done, setDone] = useState<ImportResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(
    () => (text.trim() ? parseCourseBundle(text, trackCodes) : null),
    [text, trackCodes],
  );

  const readFile = async (file: File) => {
    setFileName(file.name);
    setFailure('');
    setDone(null);
    setLog([]);
    setText(await file.text());
  };

  const copyGuide = async () => {
    try {
      await navigator.clipboard.writeText(COURSE_IMPORT_GUIDE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setFailure('Could not reach the clipboard. The format guide is in course-content/COURSE_IMPORT_FORMAT.md.');
    }
  };

  const downloadTemplate = () => {
    downloadJson(TEMPLATE_BUNDLE, 'course-template.json');
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  const runImport = async () => {
    if (!parsed?.bundle) return;
    setRunning(true);
    setFailure('');
    setLog([]);
    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const result = await importCourseBundle(supabase, parsed.bundle, {
        mode,
        courseId: mode === 'append' ? Number(targetCourseId) : undefined,
        instructorIds: instructorIds.length ? instructorIds : [currentAdminId].filter(Boolean),
        publish,
        onProgress: message => setLog(entries => [...entries, message]),
      });
      setDone(result);
      onImported(result);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    }
    setRunning(false);
  };

  const bundle = parsed?.bundle;
  const errors = parsed?.errors || [];
  const warnings = parsed?.warnings || [];
  const totals = bundle
    ? bundle.lessons.reduce(
      (acc, lesson) => ({
        questions: acc.questions + lesson.questions.length,
        testCases: acc.testCases + lesson.test_cases.length,
      }),
      { questions: 0, testCases: 0 },
    )
    : null;
  const canImport = !!bundle && !running && (mode === 'new' || !!targetCourseId);

  return (
    <div
      onClick={event => { if (event.target === event.currentTarget && !running) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,12,14,0.72)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '4vh 16px', overflowY: 'auto',
      }}
    >
      <div style={{
        background: '#22262B', border: '1px solid #2A2F35', borderRadius: 20,
        width: '100%', maxWidth: 760, padding: '1.75rem 2rem',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>{'// bulk authoring'}</div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: '#F5F5F5' }}>Import a course</h2>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
              Load a course bundle (.json) and create every lesson, quiz question, and test case in one pass.
            </p>
          </div>
          <button onClick={onClose} disabled={running} style={{
            background: 'transparent', border: '1px solid #3A3F46', borderRadius: 20,
            padding: '5px 14px', fontSize: 12, color: '#6B7280',
            cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>Close</button>
        </div>

        <div style={{
          ...panel, marginBottom: 16,
          borderColor: 'rgba(213,156,16,0.25)', background: 'rgba(213,156,16,0.06)',
        }}>
          <div style={{ fontSize: 12.5, color: '#C9CDD3', lineHeight: 1.5, marginBottom: 12 }}>
            Writing the course with an AI agent? Hand it the format guide and the template, then bring back the JSON it produces.
            The template is a full six-lesson course covering every lesson type, so it works as a starting point on its own.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={copyGuide} style={{
              background: '#D59C10', border: 'none', borderRadius: 50, padding: '8px 18px',
              fontSize: 12.5, fontWeight: 700, color: '#1A1D21', cursor: 'pointer',
              whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif',
            }}>{copied ? 'Copied' : 'Copy format guide'}</button>
            <button onClick={downloadTemplate} style={{
              background: 'transparent', border: '1px solid rgba(213,156,16,0.4)', borderRadius: 50,
              padding: '8px 18px', fontSize: 12.5, fontWeight: 600, color: '#D59C10',
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'DM Sans, sans-serif',
            }}>{downloaded ? 'Downloaded' : 'Download template (.json)'}</button>
          </div>
        </div>

        {/* File input */}
        <div
          onDragOver={event => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) readFile(file);
          }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `1px dashed ${dragging ? '#D59C10' : '#3A3F46'}`,
            background: dragging ? 'rgba(213,156,16,0.06)' : '#1A1D21',
            borderRadius: 14, padding: '22px 16px', textAlign: 'center',
            cursor: 'pointer', marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 13.5, color: '#F5F5F5', fontWeight: 600 }}>
            {fileName || 'Drop the .json bundle here, or click to choose a file'}
          </div>
          <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 5, fontFamily: 'JetBrains Mono, monospace' }}>
            {fileName ? 'Click to choose a different file' : 'or paste the JSON below'}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={event => { const file = event.target.files?.[0]; if (file) readFile(file); }}
            style={{ display: 'none' }}
          />
        </div>

        <textarea
          value={text}
          onChange={event => { setText(event.target.value); setFileName(''); setDone(null); setFailure(''); }}
          placeholder='{ "format": "daintymindz-course", "version": 1, "course": { ... }, "lessons": [ ... ] }'
          rows={5}
          style={{
            ...input, height: 'auto', padding: '10px 14px', resize: 'vertical',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.6, marginBottom: 16,
          }}
        />

        {/* Validation */}
        {errors.length > 0 && (
          <div style={{ ...panel, borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.06)', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#F87171', marginBottom: 8 }}>
              {errors.length} problem{errors.length === 1 ? '' : 's'} to fix before importing
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 190, overflowY: 'auto' }}>
              {errors.map((issue, index) => (
                <div key={index} style={{ fontSize: 12.5, color: '#E5E7EB', lineHeight: 1.5 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F87171', fontSize: 11.5 }}>{issue.path}</span>
                  {' '}{issue.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div style={{ ...panel, borderColor: 'rgba(213,156,16,0.25)', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D59C10', marginBottom: 8 }}>
              {warnings.length} warning{warnings.length === 1 ? '' : 's'}, the import will still run
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
              {warnings.map((issue, index) => (
                <div key={index} style={{ fontSize: 12.5, color: '#9CA3AF', lineHeight: 1.5 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D59C10', fontSize: 11.5 }}>{issue.path}</span>
                  {' '}{issue.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {bundle && totals && (
          <div style={{ ...panel, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#F5F5F5' }}>{bundle.course.title}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10' }}>{bundle.course.track}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
              {bundle.course.level}
              {bundle.course.duration ? ` · ${bundle.course.duration}` : ''}
              {` · ${bundle.lessons.length} lesson${bundle.lessons.length === 1 ? '' : 's'}`}
              {totals.questions ? ` · ${totals.questions} quiz question${totals.questions === 1 ? '' : 's'}` : ''}
              {totals.testCases ? ` · ${totals.testCases} test case${totals.testCases === 1 ? '' : 's'}` : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 210, overflowY: 'auto' }}>
              {bundle.lessons.map((lesson, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#E5E7EB' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6B7280', width: 22, flexShrink: 0 }}>{index + 1}</span>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 10, flexShrink: 0,
                    color: TYPE_COLORS[lesson.type] || '#6B7280',
                    background: `${TYPE_COLORS[lesson.type] || '#6B7280'}15`,
                    border: `1px solid ${TYPE_COLORS[lesson.type] || '#6B7280'}30`,
                    borderRadius: 8, padding: '2px 8px',
                  }}>{lesson.type}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</span>
                  {lesson.requires_review && <span style={{ fontSize: 10.5, color: '#9B6FD4', flexShrink: 0 }}>review</span>}
                  {lesson.questions.length > 0 && <span style={{ fontSize: 10.5, color: '#4E8FD4', flexShrink: 0 }}>{lesson.questions.length}Q</span>}
                  {lesson.test_cases.length > 0 && <span style={{ fontSize: 10.5, color: '#E86F4E', flexShrink: 0 }}>{lesson.test_cases.length}T</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        {bundle && !done && (
          <div style={{ display: 'grid', gap: 14, marginBottom: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={label}>Destination</label>
                <select
                  aria-label="Import destination"
                  style={{ ...input, cursor: 'pointer' }}
                  value={mode}
                  onChange={event => setMode(event.target.value as 'new' | 'append')}
                >
                  <option value="new">Create a new course</option>
                  <option value="append" disabled={!courses.length}>Add lessons to an existing course</option>
                </select>
              </div>
              <div>
                <label style={label}>Published state</label>
                <select
                  aria-label="Published state for imported lessons"
                  style={{ ...input, cursor: 'pointer' }}
                  value={publish}
                  onChange={event => setPublish(event.target.value as 'file' | 'all' | 'none')}
                >
                  <option value="file">Use the setting in the file</option>
                  <option value="none">Import everything as drafts</option>
                  <option value="all">Publish every lesson now</option>
                </select>
              </div>
            </div>

            {mode === 'append' && (
              <div>
                <label style={label}>Course to add to</label>
                <select
                  aria-label="Course to add lessons to"
                  style={{ ...input, cursor: 'pointer' }}
                  value={targetCourseId}
                  onChange={event => setTargetCourseId(Number(event.target.value))}
                >
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>
                  Lessons are appended after the last existing lesson. Nothing already in the course is changed.
                </div>
              </div>
            )}

            {mode === 'new' && (
              <div>
                <label style={label}>Course instructors (certificate signatories)</label>
                <div style={{ ...input, height: 'auto', minHeight: 46, padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  {adminProfiles.map(admin => {
                    const checked = instructorIds.includes(admin.id);
                    return (
                      <label key={admin.id} style={{ display: 'flex', alignItems: 'center', gap: 9, color: checked ? '#F5F5F5' : '#9CA3AF', fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setInstructorIds(ids => (
                            ids.includes(admin.id) ? ids.filter(id => id !== admin.id) : [...ids, admin.id]
                          ))}
                          style={{ accentColor: '#D59C10' }}
                        />
                        <span>{admin.full_name}{admin.position ? ` (${admin.position})` : ''}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress */}
        {log.length > 0 && (
          <div style={{ ...panel, marginBottom: 14, fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: '#9CA3AF', maxHeight: 170, overflowY: 'auto' }}>
            {log.map((entry, index) => (
              <div key={index} style={{ marginBottom: 4 }}>{entry}</div>
            ))}
          </div>
        )}

        {failure && (
          <div style={{ ...panel, borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.06)', marginBottom: 14, fontSize: 13, color: '#F87171' }}>
            {failure}
          </div>
        )}

        {done && (
          <div style={{ ...panel, borderColor: 'rgba(76,175,125,0.3)', background: 'rgba(76,175,125,0.06)', marginBottom: 14, fontSize: 13, color: '#4CAF7D' }}>
            Imported {done.lessons} lesson{done.lessons === 1 ? '' : 's'} into &quot;{done.courseTitle}&quot;
            {done.questions ? `, ${done.questions} quiz question${done.questions === 1 ? '' : 's'}` : ''}
            {done.testCases ? `, ${done.testCases} test case${done.testCases === 1 ? '' : 's'}` : ''}.
            Open the Lesson Builder to review before publishing.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          {!done && (
            <button onClick={runImport} disabled={!canImport} style={{
              background: canImport ? '#D59C10' : '#3A3F46', border: 'none', borderRadius: 50,
              padding: '10px 28px', fontSize: 14, fontWeight: 700,
              color: canImport ? '#1A1D21' : '#6B7280',
              cursor: canImport ? 'pointer' : 'not-allowed', fontFamily: 'DM Sans, sans-serif',
            }}>{running ? 'Importing...' : 'Import course'}</button>
          )}
          <button onClick={onClose} disabled={running} style={{
            background: 'transparent', border: '1px solid #3A3F46', borderRadius: 50,
            padding: '10px 28px', fontSize: 14, color: done ? '#F5F5F5' : '#6B7280',
            cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>{done ? 'Done' : 'Cancel'}</button>
        </div>
      </div>
    </div>
  );
}
