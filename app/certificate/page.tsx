'use client';
import Image from 'next/image';
import { useState } from 'react';

const CERT = {
  id: 'CERT-DM-2026-001',
  studentName: 'Gloria Iheoma Njoku',
  courseName: 'Intro to Machine Learning',
  track: 'Artificial Intelligence',
  trackCode: 'AI',
  level: 'Beginner',
  issueDate: 'June 13, 2026',
  director: 'Dr. Judith N. Njoku',
  directorTitle: 'Programme Director, Daintymindz Academy',
};

export default function CertificatePage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://academy.daintymindz.com/verify/${CERT.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => window.print();

  return (
    <div style={{
      background: '#1A1D21', minHeight: '100vh',
      fontFamily: 'DM Sans, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* NAV */}
      <nav style={{
        height: 56, background: '#1A1D21',
        borderBottom: '1px solid #2A2F35',
        display: 'flex', alignItems: 'center',
        padding: '0 1.5rem', gap: 12,
        flexShrink: 0,
      }}>
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={100} height={36} style={{ objectFit: 'contain' }} />
          <span style={{ fontSize: 14, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 8 }}>Academy</span>
        </a>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 13, color: '#6B7280' }}>Certificates</span>
        <span style={{ color: '#3A3F46', fontSize: 12 }}>›</span>
        <span style={{ fontSize: 13, color: '#F5F5F5', fontWeight: 500 }}>{CERT.id}</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleCopy}
          style={{
            background: copied ? 'rgba(76,175,125,0.1)' : 'transparent',
            border: copied ? '1px solid rgba(76,175,125,0.3)' : '1px solid #2A2F35',
            borderRadius: 20, padding: '6px 16px',
            color: copied ? '#4CAF7D' : '#6B7280',
            fontSize: 13, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.2s',
          }}
        >
          {copied ? 'Link copied!' : 'Copy verify link'}
        </button>
        <button
          onClick={handlePrint}
          style={{
            background: '#D59C10', border: 'none',
            borderRadius: 20, padding: '6px 20px',
            color: '#1A1D21', fontSize: 13,
            fontWeight: 700, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Download PDF
        </button>
      </nav>

      {/* BODY */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '1fr 360px',
        overflow: 'hidden',
      }}>

        {/* LEFT — Certificate preview */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '3rem', overflowY: 'auto',
          borderRight: '1px solid #2A2F35',
        }}>
          {/* Certificate document */}
          <div
            id="certificate"
            style={{
              width: 720, background: '#FFFFFF',
              padding: '56px 64px',
              position: 'relative',
              boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            }}
          >
            {/* Outer border */}
            <div style={{
              position: 'absolute', inset: 10,
              border: '3px solid #33383D',
              pointerEvents: 'none',
            }} />
            {/* Inner gold border */}
            <div style={{
              position: 'absolute', inset: 16,
              border: '1px solid #D59C10',
              pointerEvents: 'none',
            }} />
            {/* Inner thin border */}
            <div style={{
              position: 'absolute', inset: 20,
              border: '0.5px solid rgba(213,156,16,0.3)',
              pointerEvents: 'none',
            }} />

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>

              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 28 }}>
                <Image src="/logo.png" alt="Daintymindz" width={140} height={52} style={{ objectFit: 'contain' }} />
              </div>

              {/* Academy label */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, letterSpacing: '0.3em',
                textTransform: 'uppercase', color: '#6B7280',
                marginBottom: 28,
              }}>
                Academy · Research Division
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ flex: 1, height: 1, background: '#D59C10', opacity: 0.4 }} />
                <div style={{ width: 6, height: 6, background: '#D59C10', transform: 'rotate(45deg)' }} />
                <div style={{ flex: 1, height: 1, background: '#D59C10', opacity: 0.4 }} />
              </div>

              {/* Certificate of completion */}
              <div style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, letterSpacing: '0.25em',
                textTransform: 'uppercase', color: '#6B7280',
                marginBottom: 16,
              }}>
                Certificate of Completion
              </div>

              <div style={{
                fontSize: 15, color: '#6B7280',
                marginBottom: 20, fontStyle: 'italic',
              }}>
                This is to certify that
              </div>

              {/* Student name */}
              <div style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 36, fontWeight: 700,
                color: '#33383D', marginBottom: 6,
                letterSpacing: '-0.02em',
              }}>
                {CERT.studentName}
              </div>

              {/* Gold underline */}
              <div style={{
                width: 200, height: 2, background: '#D59C10',
                margin: '0 auto 24px',
              }} />

              <div style={{ fontSize: 15, color: '#6B7280', marginBottom: 8 }}>
                has successfully completed
              </div>

              {/* Course name */}
              <div style={{
                fontSize: 22, fontWeight: 700,
                color: '#33383D', marginBottom: 8,
                letterSpacing: '-0.01em',
              }}>
                {CERT.courseName}
              </div>

              {/* Track + level */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                marginBottom: 36,
              }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10, letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  background: 'rgba(213,156,16,0.08)',
                  border: '1px solid rgba(213,156,16,0.3)',
                  borderRadius: 20, padding: '4px 14px',
                  color: '#A37808',
                }}>
                  {CERT.trackCode} Track
                </div>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10, letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  background: 'rgba(51,56,61,0.06)',
                  border: '1px solid rgba(51,56,61,0.15)',
                  borderRadius: 20, padding: '4px 14px',
                  color: '#6B7280',
                }}>
                  {CERT.level}
                </div>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                <div style={{ width: 4, height: 4, background: '#D59C10', transform: 'rotate(45deg)' }} />
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              </div>

              {/* Footer row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, alignItems: 'end' }}>

                {/* Signature left */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 18, fontWeight: 700,
                    color: '#33383D', fontStyle: 'italic',
                    marginBottom: 6, letterSpacing: '-0.01em',
                  }}>
                    Dr. J. Njoku
                  </div>
                  <div style={{ height: 1, background: '#33383D', marginBottom: 6 }} />
                  <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{CERT.director}</div>
                </div>

                {/* Center seal */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    border: '2px solid #D59C10',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 8px',
                    background: 'rgba(213,156,16,0.04)',
                  }}>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 18, fontWeight: 700, color: '#D59C10',
                    }}>D</div>
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 7, color: '#A37808', letterSpacing: '0.1em',
                    }}>VERIFIED</div>
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 9, color: '#9CA3AF', letterSpacing: '0.08em',
                  }}>
                    {CERT.id}
                  </div>
                </div>

                {/* Date right */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 14, fontWeight: 600,
                    color: '#33383D', marginBottom: 6,
                  }}>
                    {CERT.issueDate}
                  </div>
                  <div style={{ height: 1, background: '#33383D', marginBottom: 6 }} />
                  <div style={{ fontSize: 11, color: '#6B7280' }}>Date of Completion</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Details panel */}
        <div style={{
          padding: '2rem 1.5rem',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, color: '#D59C10',
              letterSpacing: '0.2em', textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              {'// certificate details'}
            </div>
            <h2 style={{
              fontSize: 18, fontWeight: 700, color: '#F5F5F5',
              marginBottom: 4, letterSpacing: '-0.01em',
            }}>
              {CERT.courseName}
            </h2>
            <p style={{ fontSize: 13, color: '#6B7280' }}>{CERT.track} Track</p>
          </div>

          {/* Detail rows */}
          <div style={{
            background: '#22262B', border: '1px solid #2A2F35',
            borderRadius: 16, overflow: 'hidden',
          }}>
            {[
              { label: 'Recipient', value: CERT.studentName },
              { label: 'Course', value: CERT.courseName },
              { label: 'Track', value: CERT.track },
              { label: 'Level', value: CERT.level },
              { label: 'Issued', value: CERT.issueDate },
              { label: 'Certificate ID', value: CERT.id },
            ].map((row, i) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', gap: 12,
                padding: '12px 16px',
                borderTop: i === 0 ? 'none' : '1px solid #2A2F35',
              }}>
                <span style={{
                  fontSize: 12, color: '#6B7280',
                  fontFamily: 'JetBrains Mono, monospace',
                  flexShrink: 0,
                }}>{row.label}</span>
                <span style={{
                  textAlign: 'right', lineHeight: 1.4,
                  fontFamily: row.label === 'Certificate ID' ? 'JetBrains Mono, monospace' : 'DM Sans, sans-serif',
                  fontSize: row.label === 'Certificate ID' ? 11 : 12,
                  color: row.label === 'Certificate ID' ? '#D59C10' : '#F5F5F5',
                }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Verify box */}
          <div style={{
            background: 'rgba(213,156,16,0.05)',
            border: '1px solid rgba(213,156,16,0.2)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, color: '#D59C10',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              marginBottom: 8,
            }}>Verification URL</div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11, color: '#6B7280',
              wordBreak: 'break-all', lineHeight: 1.6,
            }}>
              academy.daintymindz.com/verify/{CERT.id}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '12px 0', borderRadius: 50,
                background: '#D59C10', border: 'none',
                color: '#1A1D21', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Download PDF
            </button>
            <button
              onClick={handleCopy}
              style={{
                padding: '12px 0', borderRadius: 50,
                background: 'transparent',
                border: '1px solid #2A2F35',
                color: copied ? '#4CAF7D' : '#F5F5F5',
                fontSize: 14, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.2s',
              }}
            >
              {copied ? 'Link copied!' : 'Copy verification link'}
            </button>
            <a href="/dashboard" style={{
              padding: '12px 0', borderRadius: 50,
              background: 'transparent',
              border: '1px solid #2A2F35',
              color: '#6B7280', fontSize: 14,
              textDecoration: 'none', textAlign: 'center',
              display: 'block',
            }}>
              Back to dashboard
            </a>
          </div>

          {/* Share to LinkedIn hint */}
          <div style={{
            background: '#22262B', border: '1px solid #2A2F35',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: '#F5F5F5', marginBottom: 6,
            }}>Share your achievement</div>
            <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
              Add this certificate to your LinkedIn profile under Licenses and Certifications using the certificate ID above.
            </p>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #certificate, #certificate * { visibility: visible; }
          #certificate {
            position: fixed; top: 0; left: 0;
            width: 100vw; box-shadow: none;
            padding: 40px 48px;
          }
        }
      `}</style>
    </div>
  );
}