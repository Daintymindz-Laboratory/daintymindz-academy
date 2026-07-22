-- Public certificate verification needs instructor names and positions, but
-- should not expose complete profile rows. This function bypasses profile RLS
-- and returns only the fields printed on a certificate.
CREATE OR REPLACE FUNCTION public.get_public_certificate(p_cert_id text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'certificate', jsonb_build_object(
      'cert_id', cert.cert_id,
      'issued_at', cert.issued_at,
      'profiles', jsonb_build_object('full_name', recipient.full_name),
      'courses', jsonb_build_object(
        'title', course.title,
        'track', course.track,
        'level', course.level,
        'created_by', course.created_by,
        'instructor_ids', course.instructor_ids
      )
    ),
    'creators', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('full_name', instructor.full_name, 'position', instructor.position)
        ORDER BY array_position(
          CASE
            WHEN cardinality(course.instructor_ids) > 0 THEN course.instructor_ids
            ELSE ARRAY[course.created_by]
          END,
          instructor.id
        )
      )
      FROM profiles instructor
      WHERE instructor.id = ANY(
        CASE
          WHEN cardinality(course.instructor_ids) > 0 THEN course.instructor_ids
          ELSE ARRAY[course.created_by]
        END
      )
    ), '[]'::jsonb)
  )
  FROM certificates cert
  JOIN profiles recipient ON recipient.id = cert.user_id
  JOIN courses course ON course.id = cert.course_id
  WHERE cert.cert_id = p_cert_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_certificate(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
