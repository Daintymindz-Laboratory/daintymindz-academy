// Shared completion helpers, used by both the client-side `markComplete`
// (app/lesson/[courseId]/[lessonId]/page.tsx) and the server-side
// /api/complete-lesson route, so the two can't drift.

/** Append a lesson id to a completed-lessons list, deduped. Idempotent. */
export function addCompletedLesson(completed: number[], lessonId: number): number[] {
  const safe = completed.map(Number);
  return safe.includes(lessonId) ? safe : [...safe, lessonId];
}

/** Whole-number percentage of a course completed. */
export function completionPercentage(completedCount: number, totalLessons: number): number {
  if (!totalLessons) return 0;
  return Math.round((completedCount / totalLessons) * 100);
}

/**
 * Generate a certificate id in the canonical format, e.g. CERT-DM-2026-A1B2C3.
 * `rand` supplies the 6-char suffix source (defaults to Math.random) so the
 * caller can pass a deterministic source in tests.
 */
export function generateCertId(year: number, rand: () => number = Math.random): string {
  const suffix = rand().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0');
  return `CERT-DM-${year}-${suffix}`;
}
