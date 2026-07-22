import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ certId: string }> },
) {
  const { certId } = await params;
  const supabase = createServiceClient();
  const { data: certificate, error } = await supabase
    .from('certificates')
    .select('cert_id, issued_at, user_id, course_id')
    .eq('cert_id', certId)
    .single();

  if (error || !certificate) {
    return Response.json({ error: 'Certificate not found' }, { status: 404 });
  }

  const [{ data: recipient }, { data: course, error: courseError }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', certificate.user_id).single(),
    supabase.from('courses').select('title, track, level, created_by, instructor_ids').eq('id', certificate.course_id).single(),
  ]);
  if (courseError || !course) {
    return Response.json({ error: 'Certificate course not found' }, { status: 404 });
  }

  const instructorIds: string[] = course?.instructor_ids?.length
    ? course.instructor_ids
    : [course?.created_by].filter(Boolean) as string[];

  const { data: profiles } = instructorIds.length
    ? await supabase.from('profiles').select('id, full_name, position').in('id', instructorIds)
    : { data: [] };
  const profilesById = new Map((profiles || []).map(profile => [profile.id, profile]));
  const creators = instructorIds
    .map(id => profilesById.get(id))
    .filter(Boolean)
    .map(profile => ({ full_name: profile!.full_name, position: profile!.position }));

  return Response.json({
    certificate: {
      cert_id: certificate.cert_id,
      issued_at: certificate.issued_at,
      profiles: { full_name: recipient?.full_name || '' },
      courses: course,
    },
    creators,
  });
}
