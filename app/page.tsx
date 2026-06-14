'use client';
import Image from 'next/image';
import { useEffect, useRef } from 'react';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    type Dot = { x: number; y: number; pulse: number; speed: number };
    const dots: Dot[] = [];
    const SPACING = 48;

    const buildDots = () => {
      dots.length = 0;
      for (let x = 0; x < canvas.width + SPACING; x += SPACING) {
        for (let y = 0; y < canvas.height + SPACING; y += SPACING) {
          dots.push({ x, y, pulse: Math.random() * Math.PI * 2, speed: 0.006 + Math.random() * 0.01 });
        }
      }
    };
    buildDots();
    window.addEventListener('resize', buildDots);

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(dot => {
        dot.pulse += dot.speed;
        const alpha = Math.max(0, 0.03 + Math.sin(dot.pulse) * 0.07);
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(213,156,16,${alpha})`;
        ctx.fill();
      });
      // Draw connections between nearby dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 70) {
            const alpha = Math.max(0, (0.015 * (1 - dist / 70)) * (Math.sin(dots[i].pulse) * 0.5 + 0.5));
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(213,156,16,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', buildDots);
    };
  }, []);

  const tracks = [
    {
      code: 'AI',
      name: 'Artificial Intelligence',
      desc: 'Machine learning, deep learning, neural networks, model deployment',
      count: 4,
      color: '#D59C10',
      glow: 'rgba(213,156,16,0.15)',
    },
    {
      code: 'DS',
      name: 'Data Science & Analytics',
      desc: 'Python, statistics, pandas, SQL, dashboards and visualization',
      count: 3,
      color: '#4E8FD4',
      glow: 'rgba(78,143,212,0.15)',
    },
    {
      code: 'SE',
      name: 'Software Engineering',
      desc: 'Python programming, system design, APIs and developer tooling',
      count: 3,
      color: '#4CAF7D',
      glow: 'rgba(76,175,125,0.15)',
    },
    {
      code: 'DO',
      name: 'Data Operations',
      desc: 'Data collection, annotation, engineering pipelines and MLOps',
      count: 3,
      color: '#9B6FD4',
      glow: 'rgba(155,111,212,0.15)',
    },
  ];

  return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', position: 'relative', overflow: 'hidden', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Animated neural background */}
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        borderBottom: '1px solid #2A2F35',
        background: 'rgba(26,29,33,0.85)',
        backdropFilter: 'blur(16px)',
        padding: '0 2.5rem',
        height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo + Academy badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Image src="/logo.png" alt="Daintymindz" width={120} height={44} style={{ objectFit: 'contain' }} />
          <span style={{
            fontSize: 25, fontWeight: 300,
            color: '#6B7280', letterSpacing: '0.06em',
            borderLeft: '1px solid #3A3F46', paddingLeft: 10,
          }}>Academy</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {['Courses', 'Tracks', 'About'].map(item => (
            <a key={item} href="#" style={{ color: '#6B7280', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F5F5F5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
            >{item}</a>
          ))}
          <a
            href="https://daintymindz.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              color: '#6B7280', fontSize: 14, fontWeight: 500,
              textDecoration: 'none', transition: 'color 0.15s',
              borderLeft: '1px solid #3A3F46', paddingLeft: 28,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#D59C10')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
          >
            Main site
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>

        {/* Auth buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            background: 'transparent', border: '1px solid #3A3F46',
            color: '#F5F5F5', padding: '9px 22px', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            borderRadius: 50,
          }}>Sign in</button>
          <button style={{
            background: '#D59C10', border: 'none',
            color: '#1A1D21', padding: '9px 22px', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            borderRadius: 50,
          }}>Get started</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        paddingTop: 68,
      }}>

        {/* LEFT */}
        <div style={{
          padding: '7rem 4rem 4rem',
          borderRight: '1px solid #2A2F35',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>


          <h1 style={{
            fontSize: 'clamp(40px, 4.5vw, 64px)',
            fontWeight: 700, lineHeight: 1.08,
            color: '#F5F5F5', marginBottom: 24,
            letterSpacing: '-0.025em',
          }}>
            Train minds.<br />
            <span style={{ color: '#D59C10' }}>Build AI.</span><br />
            Ship research.
          </h1>

          <p style={{
            fontSize: 16, color: '#6B7280', lineHeight: 1.8,
            maxWidth: 420, marginBottom: 36,
          }}>
            A structured learning platform for Daintymindz researchers and interns. From Python foundations to production AI systems.
          </p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 52 }}>
            <button style={{
              background: '#D59C10', border: 'none',
              color: '#1A1D21', padding: '13px 30px',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', borderRadius: 50,
            }}>Start learning</button>
            <button style={{
              background: 'transparent', border: '1px solid #3A3F46',
              color: '#F5F5F5', padding: '13px 30px',
              fontSize: 15, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', borderRadius: 50,
            }}>Browse courses</button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { val: '13', label: 'Courses' },
              { val: '4', label: 'Tracks' },
              { val: '100%', label: 'Project-based' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: '#22262B',
                border: '1px solid #2A2F35',
                borderRadius: 16, padding: '16px 20px',
              }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 26, fontWeight: 500, color: '#F5F5F5', marginBottom: 4,
                }}>{s.val}</div>
                <div style={{
                  fontSize: 11, color: '#6B7280',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{
          padding: '7rem 4rem 4rem',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14,
        }}>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, color: '#3A3F46',
            letterSpacing: '0.2em', textTransform: 'uppercase',
            marginBottom: 6,
          }}>// learning tracks</div>

          {tracks.map((track, i) => (
            <div
              key={track.code}
              style={{
                border: '1px solid #2A2F35',
                borderRadius: 20,
                padding: '22px 26px',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: '#22262B',
                transition: 'border-color 0.25s, background 0.25s, box-shadow 0.25s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = track.color;
                el.style.background = '#2A2F35';
                el.style.boxShadow = `0 0 24px ${track.glow}`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.borderColor = '#2A2F35';
                el.style.background = '#22262B';
                el.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{
                  width: 40, height: 40,
                  borderRadius: 12,
                  background: track.glow,
                  border: `1px solid ${track.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11, fontWeight: 700,
                  color: track.color, letterSpacing: '0.1em',
                  flexShrink: 0,
                }}>{track.code}</div>
                <div>
                  <div style={{
                    fontSize: 15, fontWeight: 600,
                    color: '#F5F5F5', marginBottom: 4,
                  }}>{track.name}</div>
                  <div style={{
                    fontSize: 12, color: '#6B7280', lineHeight: 1.5,
                  }}>{track.desc}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 20, color: track.color, fontWeight: 500,
                }}>{track.count}</div>
                <div style={{
                  fontSize: 10, color: '#6B7280',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                }}>courses</div>
              </div>
            </div>
          ))}

          {/* Certificate strip */}
          <div style={{
            marginTop: 4,
            padding: '14px 24px',
            borderRadius: 50,
            border: '1px solid rgba(213,156,16,0.3)',
            background: 'rgba(213,156,16,0.05)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#D59C10',
                boxShadow: '0 0 10px rgba(213,156,16,0.6)',
              }} />
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11, color: '#D59C10', letterSpacing: '0.1em',
              }}>Verified certificate on completion</span>
            </div>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10, color: '#6B7280', letterSpacing: '0.1em',
            }}>CERT-DM-2026</span>
          </div>
        </div>
      </section>
    </div>
  );
}