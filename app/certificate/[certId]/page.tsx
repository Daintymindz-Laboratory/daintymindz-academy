'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeCanvas as QRCode } from 'qrcode.react';

type CertData = {
  cert_id: string;
  issued_at: string;
  profiles: { full_name: string };
  courses: { title: string; track: string; level: string };
};

const TRACKS: Record<string, { label: string; color: string }> = {
  AI: { label: 'Artificial Intelligence', color: '#D59C10' },
  DS: { label: 'Data Science & Analytics', color: '#4E8FD4' },
  SE: { label: 'Software Engineering', color: '#4CAF7D' },
  DO: { label: 'Data Operations', color: '#9B6FD4' },
};

const printStyles = `
  @media print {
    @page { size: landscape; margin: 0; }
    html { height: 100vh; }
    body { height: 100vh; overflow: hidden; margin: 0; padding: 0; }
    body * { visibility: hidden; }
    #certificate {
      visibility: visible !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: none !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 30px 80px !important;
      box-sizing: border-box !important;
    }
    #certificate * { visibility: visible !important; }
  }
`;

export default function CertificateViewPage() {
  const params = useParams();
  const certId = params.certId as string;
  const [cert, setCert] = useState<CertData | null>(null);
  const [sealUrl, setSealUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/certificate/${certId}`
    : `https://academy.daintymindz.com/certificate/${certId}`;

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();

      const { data } = await supabase
        .from('certificates')
        .select('*, profiles(full_name), courses(title, track, level)')
        .eq('cert_id', certId)
        .single();
      if (data) setCert(data);

      const { data: signedData } = await supabase.storage
        .from('assets')
        .createSignedUrl('Seal.png', 3600);
      if (signedData?.signedUrl) {
        setSealUrl(signedData.signedUrl);
      }

      setLoading(false);
    };
    init();
  }, [certId]);

  const handlePrint = () => window.print();

  const handleCopy = () => {
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkedIn = () => {
    if (!cert) return;
    const p = new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: cert.courses?.title || '',
      organizationName: 'Daintymindz Academy',
      issueYear: new Date(cert.issued_at).getFullYear().toString(),
      issueMonth: (new Date(cert.issued_at).getMonth() + 1).toString(),
      certUrl: verifyUrl,
      certId: cert.cert_id,
    });
    window.open(`https://www.linkedin.com/profile/add?${p.toString()}`, '_blank');
  };

  if (loading) return (
    <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#D59C10', fontSize: 13 }}>Loading certificate...</div>
    </div>
  );

  if (!cert) return (
    <div style={{ background: '#1A1D21', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6B7280', fontSize: 13, marginBottom: 16 }}>Certificate not found.</div>
        <a href="/certificates" style={{ color: '#D59C10', textDecoration: 'none' }}>Back to certificates</a>
      </div>
    </div>
  );

  const track = TRACKS[cert.courses?.track] || TRACKS.AI;
  const issueDate = new Date(cert.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>

      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* NAV */}
      <nav style={{
        height: 56, background: '#1A1D21', borderBottom: '1px solid #2A2F35',
        display: 'flex', alignItems: 'center', padding: '0 1.5rem', gap: 12, flexShrink: 0,
      }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={100} height={36} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 14, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 8 }}>Academy</span>
        </a>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <a href="/certificates" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>Certificates</a>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 13, color: '#F5F5F5', fontWeight: 500 }}>{cert.cert_id}</span>
        <div style={{ flex: 1 }} />
        <button onClick={handleCopy} style={{
          background: copied ? 'rgba(76,175,125,0.1)' : 'transparent',
          border: copied ? '1px solid rgba(76,175,125,0.3)' : '1px solid #2A2F35',
          borderRadius: 20, padding: '6px 16px',
          color: copied ? '#4CAF7D' : '#6B7280',
          fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}>{copied ? 'Link copied!' : 'Copy verify link'}</button>
        <button onClick={handlePrint} style={{
          background: '#D59C10', border: 'none', borderRadius: 20, padding: '6px 20px',
          color: '#1A1D21', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}>Download PDF</button>
      </nav>

      {/* BODY */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', overflow: 'hidden' }}>

        {/* LEFT */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '3rem', overflowY: 'auto', borderRight: '1px solid #2A2F35',
        }}>
          <div id="certificate" style={{
            width: 740, background: '#FFFFFF',
            padding: '52px 60px', position: 'relative',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          }}>
            <div style={{ position: 'absolute', inset: 10, border: '3px solid #33383D', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 16, border: '1px solid #D59C10', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 20, border: '0.5px solid rgba(213,156,16,0.3)', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Image src="/logo.png" alt="Daintymindz" width={140} height={52} style={{ objectFit: 'contain' }} />
              </div>

              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 24 }}>
                Academy
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: '#D59C10', opacity: 0.4 }} />
                <div style={{ width: 6, height: 6, background: '#D59C10', transform: 'rotate(45deg)' }} />
                <div style={{ flex: 1, height: 1, background: '#D59C10', opacity: 0.4 }} />
              </div>

              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 14 }}>
                Certificate of Completion
              </div>
              <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 18, fontStyle: 'italic' }}>
                This is to certify that
              </div>
              <div style={{ fontSize: 34, fontWeight: 700, color: '#33383D', marginBottom: 6, letterSpacing: '-0.02em' }}>
                {cert.profiles?.full_name}
              </div>
              <div style={{ width: 200, height: 2, background: '#D59C10', margin: '0 auto 20px' }} />
              <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 8 }}>has successfully completed</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#33383D', marginBottom: 12, letterSpacing: '-0.01em' }}>
                {cert.courses?.title}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em',
                  textTransform: 'uppercase', background: 'rgba(213,156,16,0.08)',
                  border: '1px solid rgba(213,156,16,0.3)', borderRadius: 20, padding: '4px 14px', color: '#A37808',
                }}>{cert.courses?.track} Track</div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em',
                  textTransform: 'uppercase', background: 'rgba(51,56,61,0.06)',
                  border: '1px solid rgba(51,56,61,0.15)', borderRadius: 20, padding: '4px 14px', color: '#6B7280',
                }}>{cert.courses?.level}</div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                <div style={{ width: 4, height: 4, background: '#D59C10', transform: 'rotate(45deg)' }} />
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 22, color: '#33383D', marginBottom: 4 }}>
                    Judith Vowels
                  </div>
                  <div style={{ height: 1, background: '#33383D', marginBottom: 6 }} />
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Dr. Judith Vowels</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>Research Director</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF' }}>Daintymindz Academy</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  {sealUrl ? (
                    <img src={sealUrl} alt="Seal" style={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto 6px', display: 'block' }} />
                  ) : (
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%', border: '2px solid #D59C10',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 8px', background: 'rgba(213,156,16,0.04)',
                    }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#D59C10' }}>D</div>
                      <div style={{ fontSize: 7, color: '#A37808', letterSpacing: '0.1em' }}>VERIFIED</div>
                    </div>
                  )}
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: '#9CA3AF', letterSpacing: '0.06em' }}>{cert.cert_id}</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <QRCode value={verifyUrl} size={64} level="M" includeMargin={false} />
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: '#33383D', marginBottom: 4 }}>{issueDate}</div>
                  <div style={{ height: 1, background: '#33383D', marginBottom: 4 }} />
                  <div style={{ fontSize: 10, color: '#6B7280' }}>Date of Completion</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ padding: '2rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>
              {'// certificate details'}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5', marginBottom: 4 }}>{cert.courses?.title}</h2>
            <p style={{ fontSize: 13, color: '#6B7280' }}>{track.label} Track</p>
          </div>

          <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 16, overflow: 'hidden' }}>
            {[
              { label: 'Recipient', value: cert.profiles?.full_name },
              { label: 'Course', value: cert.courses?.title },
              { label: 'Track', value: track.label },
              { label: 'Level', value: cert.courses?.level },
              { label: 'Issued', value: issueDate },
              { label: 'Certificate ID', value: cert.cert_id },
            ].map((row, i) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
                padding: '12px 16px', borderTop: i === 0 ? 'none' : '1px solid #2A2F35',
              }}>
                <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{row.label}</span>
                <span style={{
                  fontSize: row.label === 'Certificate ID' ? 11 : 12,
                  color: row.label === 'Certificate ID' ? '#D59C10' : '#F5F5F5',
                  textAlign: 'right', lineHeight: 1.4,
                  fontFamily: row.label === 'Certificate ID' ? 'JetBrains Mono, monospace' : 'DM Sans, sans-serif',
                }}>{row.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#22262B', border: '1px solid #2A2F35', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Verify Certificate</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <QRCode value={verifyUrl} size={80} level="M" includeMargin={false} />
              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
                Scan to verify this certificate or visit:<br />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', wordBreak: 'break-all' }}>{verifyUrl}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handlePrint} style={{
              padding: '12px 0', borderRadius: 50, background: '#D59C10', border: 'none',
              color: '#1A1D21', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}>Download PDF</button>

            <button onClick={handleLinkedIn} style={{
              padding: '12px 0', borderRadius: 50,
              background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.3)',
              color: '#4A9FE0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d={"M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"} />
              </svg>
              Add to LinkedIn
            </button>

            <button onClick={handleCopy} style={{
              padding: '12px 0', borderRadius: 50, background: 'transparent',
              border: '1px solid #2A2F35',
              color: copied ? '#4CAF7D' : '#F5F5F5', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}>{copied ? 'Link copied!' : 'Copy verification link'}</button>

            <a href="/certificates" style={{
              padding: '12px 0', borderRadius: 50, background: 'transparent',
              border: '1px solid #2A2F35', color: '#6B7280', fontSize: 14,
              textDecoration: 'none', textAlign: 'center', display: 'block',
            }}>Back to certificates</a>
          </div>
        </div>
      </div>
    </div>
  );
}