'use client';

import { useEffect, useState } from 'react';

type Resource = {
  id: number;
  title: string;
  file_name: string;
  storage_path: string;
  file_size: number | null;
};

export default function LessonResources({ lessonId, trackColor }: { lessonId: number; trackColor: string }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { createClient } = await import('@/lib/supabase');
      const { data } = await createClient()
        .from('lesson_resources')
        .select('id,title,file_name,storage_path,file_size')
        .eq('lesson_id', lessonId)
        .order('created_at');
      if (active) setResources(data || []);
    })();
    return () => { active = false; };
  }, [lessonId]);

  const download = async (resource: Resource) => {
    setDownloading(resource.id);
    const { createClient } = await import('@/lib/supabase');
    const { data, error } = await createClient().storage
      .from('lesson-resources')
      .createSignedUrl(resource.storage_path, 60, { download: resource.file_name });
    setDownloading(null);
    if (error || !data?.signedUrl) {
      window.alert(error?.message || 'Could not prepare this download.');
      return;
    }
    window.location.assign(data.signedUrl);
  };

  if (!resources.length) return null;

  return (
    <section style={{ margin: '1.25rem 0', padding: '1rem', border: '1px solid #2A2F35', borderRadius: 12, background: '#1A1D21' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: trackColor, marginBottom: 10 }}>
        Lesson downloads
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {resources.map(resource => (
          <div key={resource.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 9, background: '#22262B' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#F5F5F5', fontSize: 13, fontWeight: 600 }}>{resource.title}</div>
              <div style={{ color: '#6B7280', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {resource.file_name}{resource.file_size ? ` · ${(resource.file_size / 1024 / 1024).toFixed(2)} MB` : ''}
              </div>
            </div>
            <button onClick={() => download(resource)} disabled={downloading === resource.id} style={{ flexShrink: 0, border: `1px solid ${trackColor}55`, background: `${trackColor}18`, color: trackColor, borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontWeight: 700 }}>
              {downloading === resource.id ? 'Preparing…' : 'Download'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
