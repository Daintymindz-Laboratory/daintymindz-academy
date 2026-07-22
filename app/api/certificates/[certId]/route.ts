import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ certId: string }> },
) {
  const { certId } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('certificates')
    .select('cert_id, issued_at, profiles(full_name), courses(title, track, level, created_by, instructor_ids)')
    .eq('cert_id', certId)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Certificate not found' }, { status: 404 });
  }

  const course = Array.isArray(data.courses) ? data.courses[0] : data.courses;
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

  return Response.json({ certificate: data, creators });
}
