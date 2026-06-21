'use client';
import Image from 'next/image';

const SECTIONS = [
  {
    id: 'terms',
    title: 'Terms of Use',
    updated: 'June 2026',
    content: [
      {
        heading: '1. Acceptance of Terms',
        body: 'By accessing or using Daintymindz Academy ("the Platform"), you agree to be bound by these Terms of Use. If you do not agree, you may not use the Platform. These terms apply to all users including students, researchers, and interns affiliated with Daintymindz Laboratory.',
      },
      {
        heading: '2. Eligibility',
        body: 'The Platform is intended for individuals who have been invited or approved by Daintymindz Laboratory. You must provide accurate information during registration and keep your account credentials confidential. You are responsible for all activity that occurs under your account.',
      },
      {
        heading: '3. Use of Content',
        body: 'All course content, lessons, projects, and materials on the Platform are the intellectual property of Daintymindz Laboratory. You may access content solely for your personal learning purposes. You may not reproduce, distribute, sell, or create derivative works from any Platform content without prior written permission.',
      },
      {
        heading: '4. Acceptable Use',
        body: 'You agree not to misuse the Platform. Prohibited activities include attempting to gain unauthorised access to other accounts or systems, submitting malicious code, harassing other users, or using the Platform for any unlawful purpose. Violations may result in immediate account suspension.',
      },
      {
        heading: '5. Certificates',
        body: 'Certificates of completion are issued upon satisfying all requirements for a given course track. Certificates reflect your completion of Platform content only and do not constitute a formal academic qualification unless explicitly stated by Daintymindz Laboratory.',
      },
      {
        heading: '6. Modifications',
        body: 'Daintymindz Laboratory reserves the right to modify, suspend, or discontinue any part of the Platform at any time. We may update these Terms periodically. Continued use of the Platform after changes are posted constitutes your acceptance of the revised Terms.',
      },
      {
        heading: '7. Disclaimer of Warranties',
        body: 'The Platform is provided "as is" without warranties of any kind. Daintymindz Laboratory does not guarantee uninterrupted access, error-free operation, or that the content will meet your specific requirements.',
      },
      {
        heading: '8. Limitation of Liability',
        body: 'To the fullest extent permitted by applicable law, Daintymindz Laboratory shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.',
      },
      {
        heading: '9. Governing Law',
        body: 'These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising in connection with these Terms shall be subject to the exclusive jurisdiction of Nigerian courts.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    updated: 'June 2026',
    content: [
      {
        heading: '1. Information We Collect',
        body: 'We collect information you provide directly when creating an account: your full name, email address, and selected learning track. We also collect usage data such as lessons completed, progress percentages, and certificates earned to personalise your learning experience.',
      },
      {
        heading: '2. How We Use Your Information',
        body: 'Your information is used to: operate and maintain your account, track your learning progress, issue certificates of completion, communicate platform updates, and improve the Platform. We do not sell your personal data to third parties.',
      },
      {
        heading: '3. Data Storage',
        body: 'Your data is stored securely using Supabase, a cloud database platform with row-level security controls. Authentication is handled via Supabase Auth. Data is stored in servers located within the European Union or the United States depending on your region.',
      },
      {
        heading: '4. Cookies',
        body: 'The Platform uses session cookies to keep you signed in and maintain your authentication state. We do not use third-party advertising cookies or tracking pixels. You may disable cookies in your browser settings, but this may affect Platform functionality.',
      },
      {
        heading: '5. Data Sharing',
        body: 'We do not share your personal information with third parties except as required to operate the Platform (e.g., cloud hosting providers) or when required by law. Aggregated, anonymised usage statistics may be used internally for Platform improvement.',
      },
      {
        heading: '6. Your Rights',
        body: 'You have the right to access, correct, or delete your personal data at any time. To request data deletion or export, contact us at the email below. We will respond to requests within 30 days.',
      },
      {
        heading: '7. Data Retention',
        body: 'We retain your account data for as long as your account is active. If you request account deletion, your personal data will be removed within 30 days, except where retention is required by law.',
      },
      {
        heading: '8. Children\'s Privacy',
        body: 'The Platform is not directed at individuals under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us immediately.',
      },
      {
        heading: '9. Contact',
        body: 'For any privacy-related questions or data requests, please contact us at: hello@daintymindz.com',
      },
    ],
  },
];

export default function PolicyPage() {
  return (
    <div style={{ background: '#1A1D21', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>

      {/* NAV */}
      <nav style={{
        borderBottom: '1px solid #2A2F35',
        padding: '0 1.5rem', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        background: '#1A1D21',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <Image src="/logo.png" alt="Daintymindz" width={100} height={36} style={{ objectFit: 'contain' }} />
          <span className="dm-nav-academy" style={{ fontSize: 14, fontWeight: 300, color: '#6B7280', borderLeft: '1px solid #3A3F46', paddingLeft: 8 }}>Academy</span>
        </a>
        <a href="/signup" style={{ color: '#D59C10', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Get started
        </a>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#D59C10', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 12 }}>
            {'// legal'}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.02em', marginBottom: 12 }}>
            Terms &amp; Privacy
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.75 }}>
            These documents govern your use of Daintymindz Academy. Please read them carefully before signing up.
          </p>

          {/* Jump links */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} style={{
                fontSize: 13, fontWeight: 600, color: '#D59C10',
                textDecoration: 'none', padding: '6px 16px',
                border: '1px solid rgba(213,156,16,0.3)',
                borderRadius: 50,
              }}>
                {s.title}
              </a>
            ))}
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map((section, si) => (
          <div key={section.id} id={section.id} style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: '1.75rem', paddingBottom: '1rem', borderBottom: '1px solid #2A2F35' }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.01em' }}>
                {section.title}
              </h2>
              <span style={{ fontSize: 11, color: '#3A3F46', fontFamily: 'JetBrains Mono, monospace' }}>
                Last updated: {section.updated}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {section.content.map(item => (
                <div key={item.heading}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F5F5F5', marginBottom: 8 }}>
                    {item.heading}
                  </div>
                  <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.8, margin: 0 }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>

            {si < SECTIONS.length - 1 && (
              <div style={{ marginTop: '3rem', borderBottom: '1px solid #22262B' }} />
            )}
          </div>
        ))}

        {/* Footer note */}
        <div style={{
          background: '#22262B', border: '1px solid #2A2F35',
          borderRadius: 16, padding: '20px 24px',
        }}>
          <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.7 }}>
            Questions about these policies? Contact us at{' '}
            <a href="mailto:hello@daintymindz.com" style={{ color: '#D59C10', textDecoration: 'none' }}>
              hello@daintymindz.com
            </a>
            . By continuing to use Daintymindz Academy, you acknowledge that you have read and understood these Terms of Use and Privacy Policy.
          </div>
        </div>
      </div>
    </div>
  );
}
