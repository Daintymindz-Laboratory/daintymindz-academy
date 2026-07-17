import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createServiceClient } from '@/lib/supabase-server';
import { addCompletedLesson, completionPercentage, generateCertId } from '@/lib/completion';

// Marks a lesson complete for a target student when an admin approves their
// submission. This is a privileged operation (it writes another user's
// progress + issues a certificate), so it runs with the service-role client
// which BYPASSES RLS — meaning the caller MUST be verified as an admin first.
//
// SECURITY: unlike /api/notify (which authenticates nothing), this route
// gates every write behind an authenticated admin check. Do not remove it —
// an open completion route is an approval-bypass + certificate-forgery vector.

/** Fire a notification via the existing /api/notify route (best-effort). */
async function notifyVia(origin: string, payload: Record<string, unknown>) {
  try {
    await fetch(`${origin}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('complete-lesson notify error:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId: string = body.userId;
    const courseId = Number(body.courseId);
    const lessonId = Number(body.lessonId);
    if (!userId || !Number.isFinite(courseId) || !Number.isFinite(lessonId)) {
      return Response.json({ ok: false, error: 'Missing userId/courseId/lessonId' }, { status: 400 });
    }

    // ── Authenticate the caller and confirm they are an admin ──
    // Read-only server client bound to the caller's session cookies.
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() { /* no-op: this route never mutates the session */ },
        },
      }
    );
    const { data: { user: caller } } = await authClient.auth.getUser();
    if (!caller) {
      return Response.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
    }
    // `own read` RLS lets a user read their own profile row.
    const { data: callerProfile } = await authClient
      .from('profiles').select('is_admin').eq('id', caller.id).single();
    if (!callerProfile?.is_admin) {
      return Response.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    // ── Do the completion write for the TARGET user (service role) ──
    const admin = createServiceClient();

    // Denominator must match the lesson page: published lessons in the course.
    const { data: courseLessons } = await admin
      .from('lessons').select('id, order_index')
      .eq('course_id', courseId).eq('is_published', true);
    const total = courseLessons?.length ?? 0;
    const orderIndex = courseLessons?.find(l => Number(l.id) === lessonId)?.order_index ?? 0;

    const { data: existing } = await admin
      .from('progress').select('id, completed_lessons')
      .eq('user_id', userId).eq('course_id', courseId).maybeSingle();

    const prior: number[] = Array.isArray(existing?.completed_lessons)
      ? (existing!.completed_lessons as any[]).map(Number) : [];
    const newCompleted = addCompletedLesson(prior, lessonId);
    const percentage = completionPercentage(newCompleted.length, total);

    if (existing) {
      await admin.from('progress').update({
        completed_lessons: newCompleted, percentage,
        lesson_index: orderIndex, last_accessed: new Date().toISOString(),
      }).eq('user_id', userId).eq('course_id', courseId);
    } else {
      await admin.from('progress').insert({
        user_id: userId, course_id: courseId,
        completed_lessons: newCompleted, percentage, lesson_index: orderIndex,
      });
    }

    // ── Certificate on full completion (idempotent) ──
    let certificateIssued = false;
    if (total > 0 && newCompleted.length >= total) {
      const { data: existingCert } = await admin
        .from('certificates').select('id')
        .eq('user_id', userId).eq('course_id', courseId).maybeSingle();
      if (!existingCert) {
        const { data: course } = await admin
          .from('courses').select('title').eq('id', courseId).single();
        const certId = generateCertId(new Date().getFullYear());
        await admin.from('certificates').insert({ user_id: userId, course_id: courseId, cert_id: certId });
        certificateIssued = true;

        const origin = new URL(req.url).origin;
        const title = course?.title ?? 'your course';
        await notifyVia(origin, {
          userId, type: 'course_completed', title: 'Course completed!',
          message: `Congratulations! You completed "${title}" and earned a certificate.`,
          link: '/certificates',
        });
        await notifyVia(origin, {
          adminBroadcast: true, type: 'course_completed', title: 'Student completed a course',
          message: `A student completed "${title}".`, link: '/admin',
        });
      }
    }

    return Response.json({ ok: true, completed: newCompleted.length, percentage, certificateIssued });
  } catch (e) {
    console.error('complete-lesson route error:', e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
