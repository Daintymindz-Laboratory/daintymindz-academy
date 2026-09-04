import type { SupabaseClient } from '@supabase/supabase-js';

// Course bundle: the JSON interchange format for authoring a whole course
// outside the admin UI (by hand or with an AI agent) and importing it in one
// pass. Every field maps to a column the Lesson Builder already writes, so an
// imported course is indistinguishable from one typed in by hand.

export const BUNDLE_FORMAT = 'daintymindz-course';
export const BUNDLE_VERSION = 1;

export const LESSON_TYPES = ['lesson', 'project', 'quiz', 'mini_project', 'assessment', 'discussion'] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

export const LANGUAGES = [
  'python', 'javascript', 'typescript', 'jsx', 'html', 'css',
  'c', 'cpp', 'csharp', 'java', 'r', 'sql', 'bash', 'latex',
] as const;

// Only these three have a grading runtime in lib/codeRunner.ts.
export const GRADED_LANGUAGES = ['python', 'javascript', 'typescript'] as const;

export const QUESTION_TYPES = ['multiple_choice', 'code_output'] as const;

export type BundleQuestion = {
  question_text: string;
  question_type: (typeof QUESTION_TYPES)[number];
  options: string[];
  correct_answer: string;
  explanation: string | null;
};

export type BundleTestCase = {
  description: string;
  test_code: string;
  expected_output: string;
};

export type BundleRubricCriterion = {
  id: string;
  title: string;
  description: string;
  max_points: number;
};

export type BundleLesson = {
  title: string;
  type: LessonType;
  content: string;
  code: string;
  code_label: string;
  language: string;
  starter_code: string;
  instructions: string;
  video_url: string;
  is_published: boolean;
  requires_review: boolean;
  rubric_criteria: BundleRubricCriterion[];
  questions: BundleQuestion[];
  test_cases: BundleTestCase[];
};

export type BundleCourse = {
  title: string;
  track: string;
  level: string;
  duration: string;
  description: string;
  lessons_count: number;
  requires_enrollment_approval: boolean;
};

export type CourseBundle = {
  format: string;
  version: number;
  course: BundleCourse;
  lessons: BundleLesson[];
};

export type BundleIssue = { path: string; message: string };

export type ParseResult = {
  bundle: CourseBundle | null;
  errors: BundleIssue[];
  warnings: BundleIssue[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Markdown fields are sometimes emitted as an array of lines.
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value.join('\n');
  return '';
};

const asBool = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (['true', 'yes', '1'].includes(value.trim().toLowerCase())) return true;
    if (['false', 'no', '0'].includes(value.trim().toLowerCase())) return false;
  }
  return fallback;
};

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'criterion';

// Accepts the exact option text, a 0-based or 1-based index, or a letter
// ("B", "b)", "Option C"), which is how most generated quizzes express it.
function resolveCorrectAnswer(raw: unknown, options: string[]): string | null {
  if (typeof raw === 'number') {
    if (options[raw] !== undefined) return options[raw];
    if (options[raw - 1] !== undefined) return options[raw - 1];
    return null;
  }
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  const exact = options.find(option => option === text);
  if (exact) return exact;
  const loose = options.find(option => option.trim().toLowerCase() === text.toLowerCase());
  if (loose) return loose;
  if (/^\d+$/.test(text)) {
    const index = Number(text);
    if (options[index] !== undefined) return options[index];
    if (options[index - 1] !== undefined) return options[index - 1];
    return null;
  }
  const letter = text.match(/^(?:option\s+)?([A-Za-z])[).:]?$/);
  if (letter) {
    const index = letter[1].toLowerCase().charCodeAt(0) - 97;
    if (options[index] !== undefined) return options[index];
  }
  return null;
}

/**
 * Parse and normalize a course bundle. Never throws: everything that is wrong
 * comes back in `errors` (blocking) or `warnings` (imported anyway).
 */
export function parseCourseBundle(text: string, trackCodes: string[]): ParseResult {
  const errors: BundleIssue[] = [];
  const warnings: BundleIssue[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return {
      bundle: null,
      errors: [{ path: 'file', message: `Not valid JSON: ${error instanceof Error ? error.message : String(error)}` }],
      warnings,
    };
  }

  if (!isRecord(raw)) {
    return { bundle: null, errors: [{ path: 'file', message: 'The file must contain a JSON object.' }], warnings };
  }

  if (asText(raw.format) && asText(raw.format) !== BUNDLE_FORMAT) {
    warnings.push({ path: 'format', message: `Expected "${BUNDLE_FORMAT}", found "${asText(raw.format)}". Importing anyway.` });
  }
  const version = typeof raw.version === 'number' ? raw.version : BUNDLE_VERSION;
  if (version > BUNDLE_VERSION) {
    warnings.push({ path: 'version', message: `File is version ${version}, this app understands version ${BUNDLE_VERSION}. Unknown fields will be ignored.` });
  }

  const courseRaw = isRecord(raw.course) ? raw.course : raw;
  const lessonsRaw = Array.isArray(raw.lessons)
    ? raw.lessons
    : Array.isArray((courseRaw as Record<string, unknown>).lessons)
      ? ((courseRaw as Record<string, unknown>).lessons as unknown[])
      : null;

  if (!lessonsRaw) {
    errors.push({ path: 'lessons', message: 'Missing a "lessons" array.' });
  }

  const title = asText(courseRaw.title).trim();
  if (!title) errors.push({ path: 'course.title', message: 'Course title is required.' });
  const description = asText(courseRaw.description).trim();
  if (!description) errors.push({ path: 'course.description', message: 'Course description is required.' });

  const track = asText(courseRaw.track).trim().toUpperCase();
  if (!track) {
    errors.push({ path: 'course.track', message: `Track code is required. Available: ${trackCodes.join(', ')}.` });
  } else if (trackCodes.length && !trackCodes.includes(track)) {
    errors.push({ path: 'course.track', message: `Unknown track "${track}". Available: ${trackCodes.join(', ')}.` });
  }

  let level = asText(courseRaw.level).trim();
  const matchedLevel = LEVELS.find(item => item.toLowerCase() === level.toLowerCase());
  if (level && !matchedLevel) {
    warnings.push({ path: 'course.level', message: `Unknown level "${level}". Using "Beginner".` });
  }
  level = matchedLevel || 'Beginner';

  const lessons: BundleLesson[] = (lessonsRaw || []).map((entry, index) => {
    const path = `lessons[${index + 1}]`;
    const lessonRaw = isRecord(entry) ? entry : {};
    if (!isRecord(entry)) {
      errors.push({ path, message: 'Each lesson must be an object.' });
    }

    const lessonTitle = asText(lessonRaw.title).trim();
    if (!lessonTitle) errors.push({ path: `${path}.title`, message: 'Lesson title is required.' });

    const rawType = asText(lessonRaw.type).trim().toLowerCase().replace(/[\s-]+/g, '_');
    let type = LESSON_TYPES.find(item => item === rawType);
    if (!type) {
      if (rawType) {
        errors.push({ path: `${path}.type`, message: `Unknown lesson type "${asText(lessonRaw.type)}". Use one of: ${LESSON_TYPES.join(', ')}.` });
      } else {
        warnings.push({ path: `${path}.type`, message: 'No lesson type given. Using "lesson".' });
      }
      type = 'lesson';
    }

    let language = asText(lessonRaw.language).trim().toLowerCase() || 'python';
    if (!LANGUAGES.includes(language as (typeof LANGUAGES)[number])) {
      warnings.push({ path: `${path}.language`, message: `Unknown language "${language}". Using "python".` });
      language = 'python';
    }
    if (type === 'mini_project' && !GRADED_LANGUAGES.includes(language as (typeof GRADED_LANGUAGES)[number])) {
      warnings.push({ path: `${path}.language`, message: `Mini projects can only be auto-graded in ${GRADED_LANGUAGES.join(', ')}. "${language}" test cases will not run.` });
    }

    const content = asText(lessonRaw.content);
    const instructions = asText(lessonRaw.instructions);
    const starterCode = asText(lessonRaw.starter_code ?? lessonRaw.starterCode);

    if ((type === 'lesson' || type === 'assessment' || type === 'discussion') && !content.trim()) {
      warnings.push({ path: `${path}.content`, message: `A "${type}" lesson with no content will render empty.` });
    }
    if ((type === 'project' || type === 'mini_project') && !instructions.trim()) {
      warnings.push({ path: `${path}.instructions`, message: `A "${type}" lesson with no instructions gives students nothing to work from.` });
    }

    // Quiz questions
    const questionsRaw = Array.isArray(lessonRaw.questions) ? lessonRaw.questions
      : Array.isArray(lessonRaw.quiz_questions) ? lessonRaw.quiz_questions
        : [];
    const questions: BundleQuestion[] = questionsRaw.map((questionEntry, qIndex) => {
      const qPath = `${path}.questions[${qIndex + 1}]`;
      const questionRaw = isRecord(questionEntry) ? questionEntry : {};
      const questionText = asText(questionRaw.question_text ?? questionRaw.question ?? questionRaw.text).trim();
      if (!questionText) errors.push({ path: `${qPath}.question_text`, message: 'Question text is required.' });

      const rawOptions = Array.isArray(questionRaw.options) ? questionRaw.options
        : Array.isArray(questionRaw.choices) ? questionRaw.choices
          : [];
      const options = rawOptions
        .map(option => (isRecord(option) ? asText(option.text ?? option.label ?? option.value) : asText(option)).trim())
        .filter(Boolean);
      if (options.length < 2) {
        errors.push({ path: `${qPath}.options`, message: 'At least 2 non-empty options are required.' });
      }

      let correctRaw: unknown = questionRaw.correct_answer ?? questionRaw.answer ?? questionRaw.correct;
      if (correctRaw === undefined) {
        const flagged = rawOptions.findIndex(option => isRecord(option) && asBool(option.is_correct ?? option.correct, false));
        if (flagged >= 0) correctRaw = flagged;
      }
      const correctAnswer = resolveCorrectAnswer(correctRaw, options);
      if (!correctAnswer && options.length >= 2) {
        errors.push({ path: `${qPath}.correct_answer`, message: `"${asText(correctRaw) || 'missing'}" does not match any option. Give the exact option text.` });
      } else if (correctAnswer && typeof correctRaw === 'string' && correctRaw.trim() !== correctAnswer) {
        warnings.push({ path: `${qPath}.correct_answer`, message: `Resolved "${correctRaw.trim()}" to the option "${correctAnswer}".` });
      }

      const rawQuestionType = asText(questionRaw.question_type).trim().toLowerCase();
      const questionType = QUESTION_TYPES.find(item => item === rawQuestionType) || 'multiple_choice';
      if (rawQuestionType && questionType !== rawQuestionType) {
        warnings.push({ path: `${qPath}.question_type`, message: `Unknown question type "${rawQuestionType}". Using "multiple_choice".` });
      }

      return {
        question_text: questionText,
        question_type: questionType,
        options,
        correct_answer: correctAnswer || '',
        explanation: asText(questionRaw.explanation).trim() || null,
      };
    });

    if (type === 'quiz' && questions.length === 0) {
      errors.push({ path: `${path}.questions`, message: 'A quiz lesson needs at least one question.' });
    }
    if (type !== 'quiz' && questions.length > 0) {
      warnings.push({ path: `${path}.questions`, message: `Questions are only shown for quiz lessons, this one is "${type}". They will still be imported.` });
    }

    // Test cases
    const testCasesRaw = Array.isArray(lessonRaw.test_cases) ? lessonRaw.test_cases
      : Array.isArray(lessonRaw.testCases) ? lessonRaw.testCases
        : [];
    const testCases: BundleTestCase[] = testCasesRaw.map((testEntry, tIndex) => {
      const tPath = `${path}.test_cases[${tIndex + 1}]`;
      const testRaw = isRecord(testEntry) ? testEntry : {};
      const testDescription = asText(testRaw.description).trim();
      const expected = asText(testRaw.expected_output ?? testRaw.expected);
      if (!testDescription) {
        errors.push({ path: `${tPath}.description`, message: 'Description is required, it is what actually drives the test.' });
      }
      if (!expected.trim()) {
        errors.push({ path: `${tPath}.expected_output`, message: 'Expected output is required.' });
      }
      const isDataLiteral = /^[[{]/.test(testDescription);
      const isFunctionCall = !isDataLiteral && /^[A-Za-z_]\w*\s*\(/.test(testDescription);
      if (testDescription && !isDataLiteral && !isFunctionCall && language !== 'python') {
        warnings.push({ path: `${tPath}.description`, message: 'Variable-assignment test cases are not matched in JavaScript or TypeScript. Use the function-call form, for example add(2, 3).' });
      }
      return {
        description: testDescription,
        test_code: asText(testRaw.test_code ?? testRaw.testCode),
        expected_output: expected,
      };
    });

    if ((type === 'mini_project' || type === 'project') && testCases.length === 0) {
      warnings.push({ path: `${path}.test_cases`, message: `A "${type}" lesson with no test cases cannot be auto-graded.` });
    }
    if (type !== 'mini_project' && type !== 'project' && testCases.length > 0) {
      warnings.push({ path: `${path}.test_cases`, message: `Test cases only run for project and mini_project lessons, this one is "${type}".` });
    }

    // Rubric
    const rubricRaw = Array.isArray(lessonRaw.rubric_criteria) ? lessonRaw.rubric_criteria
      : Array.isArray(lessonRaw.rubric) ? lessonRaw.rubric
        : [];
    const rubricCriteria: BundleRubricCriterion[] = rubricRaw.map((criterionEntry, cIndex) => {
      const criterionRaw = isRecord(criterionEntry) ? criterionEntry : {};
      const criterionTitle = asText(criterionRaw.title).trim() || `Criterion ${cIndex + 1}`;
      const points = Number(criterionRaw.max_points ?? criterionRaw.points);
      return {
        id: asText(criterionRaw.id).trim() || slugify(criterionTitle),
        title: criterionTitle,
        description: asText(criterionRaw.description).trim(),
        max_points: Number.isFinite(points) && points > 0 ? points : 0,
      };
    });
    const rubricTotal = rubricCriteria.reduce((sum, criterion) => sum + criterion.max_points, 0);
    if (rubricCriteria.length && rubricTotal !== 100) {
      warnings.push({ path: `${path}.rubric_criteria`, message: `Rubric points add up to ${rubricTotal}, not 100.` });
    }

    const requiresReview = asBool(lessonRaw.requires_review, false);
    if (requiresReview && !rubricCriteria.length && (type === 'mini_project' || type === 'project' || type === 'assessment')) {
      warnings.push({ path: `${path}.requires_review`, message: 'Review is required but no rubric was supplied. Reviewers will grade without one.' });
    }

    return {
      title: lessonTitle,
      type,
      content,
      code: asText(lessonRaw.code),
      code_label: asText(lessonRaw.code_label ?? lessonRaw.codeLabel).trim() || 'example.py',
      language,
      starter_code: starterCode,
      instructions,
      video_url: asText(lessonRaw.video_url ?? lessonRaw.videoUrl).trim(),
      is_published: asBool(lessonRaw.is_published, false),
      requires_review: requiresReview,
      rubric_criteria: rubricCriteria,
      questions,
      test_cases: testCases,
    };
  });

  if (lessonsRaw && lessons.length === 0) {
    errors.push({ path: 'lessons', message: 'The lessons array is empty.' });
  }

  const declaredCount = Number(courseRaw.lessons_count);
  const lessonsCount = Number.isFinite(declaredCount) && declaredCount > 0 ? declaredCount : lessons.length;

  const bundle: CourseBundle = {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    course: {
      title,
      track,
      level,
      duration: asText(courseRaw.duration).trim(),
      description,
      lessons_count: lessonsCount,
      requires_enrollment_approval: asBool(courseRaw.requires_enrollment_approval, false),
    },
    lessons,
  };

  return { bundle: errors.length ? null : bundle, errors, warnings };
}

export type ImportOptions = {
  mode: 'new' | 'append';
  courseId?: number;
  instructorIds: string[];
  publish: 'file' | 'all' | 'none';
  onProgress?: (message: string) => void;
};

export type ImportResult = {
  courseId: number;
  courseTitle: string;
  lessons: number;
  questions: number;
  testCases: number;
};

/**
 * Write a parsed bundle to Supabase as the signed-in admin (RLS is the
 * authorization layer, same as every other admin write in this app).
 *
 * A "new" import that fails part-way deletes what it created so the admin is
 * never left with a half-built course. An "append" import leaves the existing
 * course alone and only removes the lessons this run added.
 */
export async function importCourseBundle(
  supabase: SupabaseClient,
  bundle: CourseBundle,
  options: ImportOptions,
): Promise<ImportResult> {
  const report = options.onProgress || (() => {});
  const createdLessonIds: number[] = [];
  let createdCourseId: number | null = null;

  const rollback = async () => {
    if (createdLessonIds.length) {
      await supabase.from('lessons').delete().in('id', createdLessonIds);
    }
    if (createdCourseId !== null) {
      await supabase.from('courses').delete().eq('id', createdCourseId);
    }
  };

  try {
    let courseId: number;
    let courseTitle = bundle.course.title;
    let startIndex = 0;

    if (options.mode === 'append') {
      if (!options.courseId) throw new Error('Choose the course to add these lessons to.');
      courseId = options.courseId;
      const { data: existing, error: existingError } = await supabase
        .from('lessons').select('order_index').eq('course_id', courseId).order('order_index', { ascending: false }).limit(1);
      if (existingError) throw new Error(`Could not read the existing lessons: ${existingError.message}`);
      startIndex = existing?.[0]?.order_index || 0;
      const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
      courseTitle = course?.title || courseTitle;
      report(`Adding ${bundle.lessons.length} lesson${bundle.lessons.length === 1 ? '' : 's'} to "${courseTitle}" after lesson ${startIndex}.`);
    } else {
      const payload = {
        title: bundle.course.title,
        track: bundle.course.track,
        level: bundle.course.level,
        lessons_count: bundle.course.lessons_count,
        duration: bundle.course.duration,
        description: bundle.course.description,
        created_by: options.instructorIds[0] || null,
        instructor_ids: options.instructorIds,
        requires_enrollment_approval: bundle.course.requires_enrollment_approval,
      };
      const { data, error } = await supabase.from('courses').insert(payload).select('id').single();
      if (error) throw new Error(`Could not create the course: ${error.message}`);
      courseId = data.id;
      createdCourseId = data.id;
      report(`Course "${bundle.course.title}" created.`);
    }

    let questionCount = 0;
    let testCaseCount = 0;

    for (const [index, lesson] of bundle.lessons.entries()) {
      const isPublished = options.publish === 'all' ? true
        : options.publish === 'none' ? false
          : lesson.is_published;

      const { data: inserted, error } = await supabase.from('lessons').insert({
        course_id: courseId,
        title: lesson.title,
        type: lesson.type,
        content: lesson.content,
        code: lesson.code,
        code_label: lesson.code_label,
        language: lesson.language,
        starter_code: lesson.starter_code,
        instructions: lesson.instructions,
        video_url: lesson.video_url,
        order_index: startIndex + index + 1,
        is_published: isPublished,
        requires_review: lesson.requires_review,
        rubric_criteria: lesson.rubric_criteria,
      }).select('id').single();
      if (error) throw new Error(`Lesson ${index + 1} ("${lesson.title}") failed: ${error.message}`);
      createdLessonIds.push(inserted.id);

      if (lesson.questions.length) {
        const { error: questionError } = await supabase.from('quiz_questions').insert(
          lesson.questions.map((question, qIndex) => ({
            lesson_id: inserted.id,
            order_index: qIndex + 1,
            question_text: question.question_text,
            question_type: question.question_type,
            options: question.options,
            correct_answer: question.correct_answer,
            explanation: question.explanation,
          })),
        );
        if (questionError) throw new Error(`Questions for "${lesson.title}" failed: ${questionError.message}`);
        questionCount += lesson.questions.length;
      }

      if (lesson.test_cases.length) {
        const { error: testError } = await supabase.from('mini_project_test_cases').insert(
          lesson.test_cases.map((testCase, tIndex) => ({
            lesson_id: inserted.id,
            order_index: tIndex + 1,
            description: testCase.description,
            test_code: testCase.test_code,
            expected_output: testCase.expected_output,
          })),
        );
        if (testError) throw new Error(`Test cases for "${lesson.title}" failed: ${testError.message}`);
        testCaseCount += lesson.test_cases.length;
      }

      const extras = [
        lesson.questions.length ? `${lesson.questions.length} question${lesson.questions.length === 1 ? '' : 's'}` : '',
        lesson.test_cases.length ? `${lesson.test_cases.length} test case${lesson.test_cases.length === 1 ? '' : 's'}` : '',
      ].filter(Boolean).join(', ');
      report(`Lesson ${index + 1}/${bundle.lessons.length}: ${lesson.title}${extras ? ` (${extras})` : ''}${isPublished ? '' : ' [draft]'}`);
    }

    const totalLessons = startIndex + bundle.lessons.length;
    const { error: countError } = await supabase.from('courses')
      .update({ lessons_count: options.mode === 'append' ? totalLessons : bundle.course.lessons_count })
      .eq('id', courseId);
    if (countError) report(`Note: lesson count could not be updated (${countError.message}).`);

    return {
      courseId,
      courseTitle,
      lessons: bundle.lessons.length,
      questions: questionCount,
      testCases: testCaseCount,
    };
  } catch (error) {
    report('Import failed, rolling back what was created.');
    await rollback();
    throw error;
  }
}

/**
 * Read a course back out as a bundle, so an existing course can be used as the
 * template for the next one and edited outside the admin UI.
 */
export async function exportCourseBundle(supabase: SupabaseClient, courseId: number): Promise<CourseBundle> {
  const { data: course, error: courseError } = await supabase
    .from('courses').select('*').eq('id', courseId).single();
  if (courseError || !course) throw new Error(`Could not read the course: ${courseError?.message || 'not found'}`);

  const { data: lessons, error: lessonError } = await supabase
    .from('lessons').select('*').eq('course_id', courseId).order('order_index');
  if (lessonError) throw new Error(`Could not read the lessons: ${lessonError.message}`);

  const lessonIds = (lessons || []).map(lesson => lesson.id);
  const [questionsResult, testCasesResult] = lessonIds.length
    ? await Promise.all([
      supabase.from('quiz_questions').select('*').in('lesson_id', lessonIds).order('order_index'),
      supabase.from('mini_project_test_cases').select('*').in('lesson_id', lessonIds).order('order_index'),
    ])
    : [{ data: [] }, { data: [] }];

  const questionsByLesson = new Map<number, BundleQuestion[]>();
  for (const question of questionsResult.data || []) {
    const options = Array.isArray(question.options) ? question.options : JSON.parse(question.options || '[]');
    const list = questionsByLesson.get(question.lesson_id) || [];
    list.push({
      question_text: question.question_text,
      question_type: question.question_type,
      options,
      correct_answer: question.correct_answer,
      explanation: question.explanation ?? null,
    });
    questionsByLesson.set(question.lesson_id, list);
  }

  const testCasesByLesson = new Map<number, BundleTestCase[]>();
  for (const testCase of testCasesResult.data || []) {
    const list = testCasesByLesson.get(testCase.lesson_id) || [];
    list.push({
      description: testCase.description,
      test_code: testCase.test_code || '',
      expected_output: testCase.expected_output,
    });
    testCasesByLesson.set(testCase.lesson_id, list);
  }

  return {
    format: BUNDLE_FORMAT,
    version: BUNDLE_VERSION,
    course: {
      title: course.title,
      track: course.track,
      level: course.level,
      duration: course.duration || '',
      description: course.description,
      lessons_count: course.lessons_count || (lessons || []).length,
      requires_enrollment_approval: !!course.requires_enrollment_approval,
    },
    lessons: (lessons || []).map(lesson => ({
      title: lesson.title,
      type: lesson.type,
      content: lesson.content || '',
      code: lesson.code || '',
      code_label: lesson.code_label || 'example.py',
      language: lesson.language || 'python',
      starter_code: lesson.starter_code || '',
      instructions: lesson.instructions || '',
      video_url: lesson.video_url || '',
      is_published: !!lesson.is_published,
      requires_review: !!lesson.requires_review,
      rubric_criteria: Array.isArray(lesson.rubric_criteria) ? lesson.rubric_criteria : [],
      questions: questionsByLesson.get(lesson.id) || [],
      test_cases: testCasesByLesson.get(lesson.id) || [],
    })),
  };
}

export const bundleFileName = (title: string) =>
  `${slugify(title).replace(/_/g, '-') || 'course'}.course.json`;

/** Trigger a browser download of a bundle, or of any JSON value. */
export function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * The starter bundle the import dialog hands out, mirrored at
 * course-content/example-course.json. It uses all six lesson types, so it
 * doubles as a worked reference for whoever writes the next course.
 */
export const TEMPLATE_BUNDLE: CourseBundle = {
  format: BUNDLE_FORMAT,
  version: BUNDLE_VERSION,
  course: {
    title: 'Field Data Hygiene',
    track: 'DO',
    level: 'Beginner',
    duration: '2h 30m',
    description: 'How a field capture becomes a trustworthy record: naming, metadata, validation, and the two quality gates every batch must clear.',
    lessons_count: 6,
    requires_enrollment_approval: false,
  },
  lessons: [
    {
      title: 'Why file naming is a data contract',
      type: 'lesson',
      content: [
        '# Why file naming is a data contract',
        '',
        'A capture nobody can trace back to a produce item, a session, and a device is not data, it is a picture.',
        '',
        '## The parts of a name',
        '',
        '- **produce code** identifies what was captured',
        '- **session id** groups everything captured in one sitting',
        '- **sequence** keeps ordering stable inside a session',
        '',
        'Run the cell below to see a name assembled from its parts.',
        '',
        '```python-run',
        'produce, session, sequence = "TOM", "S014", 7',
        'print(f"{produce}_{session}_{sequence:03d}.jpg")',
        '```',
      ].join('\n'),
      code: 'TOM_S014_007.jpg\nTOM_S014_008.jpg',
      code_label: 'batch-listing.txt',
      language: 'bash',
      starter_code: '',
      instructions: '',
      video_url: '',
      is_published: false,
      requires_review: false,
      rubric_criteria: [],
      questions: [],
      test_cases: [],
    },
    {
      title: 'Checkpoint: naming and metadata',
      type: 'quiz',
      content: 'Five minutes. You need 80% to move on.',
      code: '',
      code_label: 'example.py',
      language: 'python',
      starter_code: '',
      instructions: '',
      video_url: '',
      is_published: false,
      requires_review: false,
      rubric_criteria: [],
      questions: [
        {
          question_text: 'A capture arrives with no session id. What is the correct action?',
          question_type: 'multiple_choice',
          options: [
            'Quarantine the file and ask the collector to re-submit it with a session id',
            'Invent a session id so the batch stays complete',
            'Delete the file',
            'Publish it and fix the id later',
          ],
          correct_answer: 'Quarantine the file and ask the collector to re-submit it with a session id',
          explanation: 'Missing provenance is never repaired by guessing. Quarantine keeps the batch honest.',
        },
        {
          question_text: 'print(f"{7:03d}")',
          question_type: 'code_output',
          options: ['007', '7', '700', '0007'],
          correct_answer: '007',
          explanation: 'The 03d format pads the number to three digits, which keeps names sortable.',
        },
      ],
      test_cases: [],
    },
    {
      title: 'Coding test: validate a capture name',
      type: 'mini_project',
      content: '',
      code: '',
      code_label: 'example.py',
      language: 'python',
      starter_code: [
        'import re',
        '',
        '',
        'def validate_name(name):',
        '    """Return True when the capture name follows the collection standard."""',
        '    pass',
      ].join('\n'),
      instructions: [
        '## Task',
        '',
        'Implement `validate_name(name)`. It returns `True` when `name` follows',
        '`<PRODUCE>_<SESSION>_<SEQ>.jpg`, where produce is three uppercase letters,',
        'session is `S` plus three digits, and sequence is exactly three digits.',
        '',
        'Anything else returns `False`. Do not raise on malformed input.',
      ].join('\n'),
      video_url: '',
      is_published: false,
      requires_review: false,
      rubric_criteria: [],
      questions: [],
      test_cases: [
        { description: 'validate_name("TOM_S014_007.jpg")', test_code: '', expected_output: 'True' },
        { description: 'validate_name("tom_S014_007.jpg")', test_code: '', expected_output: 'False' },
        { description: 'validate_name("TOM_S14_7.jpg")', test_code: '', expected_output: 'False' },
        { description: 'validate_name("")', test_code: '', expected_output: 'False' },
      ],
    },
    {
      title: 'Project: batch validation report',
      type: 'project',
      content: '',
      code: '',
      code_label: 'example.py',
      language: 'python',
      starter_code: [
        'def build_report(names):',
        '    """Return a validation report for a batch of capture names."""',
        '    pass',
      ].join('\n'),
      instructions: [
        '## Brief',
        '',
        'Given a list of capture file names, produce a report that counts valid names,',
        'lists every rejection with its reason, and never silently drops a record.',
        '',
        'Return a dict with the keys `total`, `valid`, and `rejected`, where `rejected`',
        'is a list of `{"name": ..., "reason": ...}` entries.',
        '',
        '[ADJUST: confirm the rejection reasons the QC team wants named]',
      ].join('\n'),
      video_url: '',
      is_published: false,
      requires_review: true,
      rubric_criteria: [
        { id: 'acceptance_tests', title: 'Acceptance tests pass', description: 'Objective score from the number of acceptance tests passed.', max_points: 50 },
        { id: 'code_quality', title: 'Code quality and structure', description: 'Clear functions, meaningful names, readable orchestration.', max_points: 15 },
        { id: 'trust_mindset', title: 'Operations and trust mindset', description: 'Honest missing values and surfaced validation errors.', max_points: 15 },
        { id: 'writeup', title: 'Write-up quality', description: 'Accurate explanation of the validation decisions taken.', max_points: 15 },
        { id: 'reproducibility', title: 'Reproducibility and hygiene', description: 'Runs from a clean checkout and avoids absolute paths.', max_points: 5 },
      ],
      questions: [],
      test_cases: [
        { description: 'build_report(["TOM_S014_007.jpg"])["valid"]', test_code: '', expected_output: '1' },
        { description: 'build_report(["bad.jpg"])["rejected"][0]["name"]', test_code: '', expected_output: 'bad.jpg' },
      ],
    },
    {
      title: 'Assessment: a QC gate that failed',
      type: 'assessment',
      content: [
        '## Assessment',
        '',
        'Describe a batch that cleared gate one and failed gate two.',
        '',
        '1. What did gate one check, and why did it pass?',
        '2. What did gate two catch?',
        '3. What change upstream would have caught it earlier?',
        '',
        'Submit 400 to 600 words. Your instructor reviews this against the rubric.',
      ].join('\n'),
      code: '',
      code_label: 'example.py',
      language: 'python',
      starter_code: '',
      instructions: '',
      video_url: '',
      is_published: false,
      requires_review: true,
      rubric_criteria: [
        { id: 'understanding', title: 'Understanding and accuracy', description: 'Accurate understanding of both quality gates.', max_points: 40 },
        { id: 'application', title: 'Application and reasoning', description: 'Applies the concepts to a concrete batch and explains the reasoning.', max_points: 30 },
        { id: 'evidence', title: 'Evidence and completeness', description: 'Supports the account with specifics rather than generalities.', max_points: 20 },
        { id: 'clarity', title: 'Clarity and presentation', description: 'Clear, organized, and professional.', max_points: 10 },
      ],
      questions: [],
      test_cases: [],
    },
    {
      title: 'Discussion: the cost of a bad record',
      type: 'discussion',
      content: [
        'One malformed record can survive all the way into a trained model.',
        '',
        'Post one example from your own work, in your track, where a small data',
        'defect became expensive later. Then reply to one colleague with the check',
        'you would add to catch it at collection time.',
      ].join('\n'),
      code: '',
      code_label: 'example.py',
      language: 'python',
      starter_code: '',
      instructions: '',
      video_url: '',
      is_published: false,
      requires_review: false,
      rubric_criteria: [],
      questions: [],
      test_cases: [],
    },
  ],
};

/**
 * The authoring contract, handed to whoever (or whatever) writes the course.
 * This is the single source of truth for the format: the import dialog copies
 * it to the clipboard and course-content/COURSE_IMPORT_FORMAT.md points here.
 */
export const COURSE_IMPORT_GUIDE = `# Daintymindz Academy course bundle format

Write one JSON file that the Academy admin imports in a single pass
(Admin > Courses > Import course). Output JSON only, no prose around it.

## Envelope

{
  "format": "${BUNDLE_FORMAT}",
  "version": ${BUNDLE_VERSION},
  "course": { ... },
  "lessons": [ ... ]
}

## course

| Field | Required | Notes |
| --- | --- | --- |
| title | yes | Course title. |
| description | yes | One short paragraph, shown in the catalog. |
| track | yes | Track code: ${'`AI`'}, ${'`DA`'}, ${'`SE`'}, ${'`DO`'} (whatever exists in the Tracks tab). |
| level | no | ${LEVELS.join(', ')}. Defaults to Beginner. |
| duration | no | Free text, for example "6h 30m". |
| lessons_count | no | Defaults to the number of lessons. |
| requires_enrollment_approval | no | true if an instructor must approve each enrollment. Defaults to false. |

Instructors and the course owner are not in the file: they are chosen in the
import dialog, so the file stays portable between accounts.

## lessons

An ordered array. Position in the array is the lesson order, so do not send an
order_index. Common fields on every lesson:

| Field | Required | Notes |
| --- | --- | --- |
| title | yes | Lesson title. |
| type | yes | ${LESSON_TYPES.join(', ')}. |
| video_url | no | YouTube or Loom link, embedded above the lesson. Only set this when a genuinely strong, verified resource exists. |
| is_published | no | Defaults to false (draft). The import dialog can override every lesson. |
| requires_review | no | true swaps self-serve completion for an instructor-reviewed submission. |
| rubric_criteria | no | Only used when requires_review is true. Array of { id, title, description, max_points }, points should total 100. |

Per type, fill only the fields that type actually renders:

- **lesson**: ${'`content`'} (markdown article) plus optional ${'`code`'}, ${'`language`'}, ${'`code_label`'}
  for the side panel. A fenced ${'```python-run'} block inside content becomes a runnable cell.
- **assessment**: ${'`content`'} (markdown only). Usually paired with requires_review: true.
- **discussion**: ${'`content`'} is the prompt. Learners must post a response before Next unlocks.
- **quiz**: optional ${'`content`'} intro plus ${'`questions`'} (see below). Pass mark is 80%.
- **project**: ${'`instructions`'} (markdown), ${'`starter_code`'}, ${'`language`'}, and ${'`test_cases`'}.
- **mini_project**: same as project, but ${'`language`'} must be one of ${GRADED_LANGUAGES.join(', ')} because those are the only runtimes that grade in the browser.

## questions (quiz lessons)

{ "question_text": "...", "question_type": "multiple_choice" | "code_output",
  "options": ["...", "..."], "correct_answer": "exact text of one option",
  "explanation": "shown after submitting, optional" }

At least 2 options, and correct_answer must match one of them exactly.
Use code_output when the question text is itself a code snippet.

## test_cases (project and mini_project lessons)

{ "description": "...", "test_code": "...", "expected_output": "..." }

The ${'`description`'} is not a label, it is what drives the test. Three forms:

1. **Function call**: "add(2, 3)" runs the student's function with those
   arguments. Use this form for JavaScript and TypeScript, always.
2. **Data literal**: "[1, 2, 3]" or "{\\"id\\": 1}" replaces the first
   top-level list or dict assignment in the student's code.
3. **Variable assignment**: "celsius = 0, miles = 5" rewrites those variables.
   Python only.

${'`test_code`'} is optional extra code appended after the composed test (forms 1
and 2 only); it is ignored for form 3. ${'`expected_output`'} is compared against
everything the code prints, after normalization where " / " and " then " both
mean a newline. Every test must be deterministic.

## Course design conventions

- Put a quiz after at most two non-quiz lessons.
- Never force a task into a type the runtime cannot grade. If it cannot be
  auto-graded, make it a project or assessment with requires_review: true.
- Prefer linking strong third-party material over inventing video URLs.
- Mark company-specific unknowns as [ADJUST: what to confirm] in the content.
- Content fields are markdown, so escape newlines as \\n inside JSON strings.
`;
