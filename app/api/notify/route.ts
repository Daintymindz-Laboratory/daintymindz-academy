import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://academy.daintymindz.com';
const FROM_EMAIL = 'Daintymindz Academy <noreply@daintymindz.com>';

function emailHtml(title: string, message: string, link?: string) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#1A1D21;font-family:'DM Sans',Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#22262B;border-radius:16px;overflow:hidden;border:1px solid #2A2F35;">
  <div style="padding:28px 32px;border-bottom:1px solid #2A2F35;">
    <span style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;color:#D59C10;letter-spacing:-0.02em;">DAINTYMINDZ</span>
    <span style="font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700;color:#F5F5F5;letter-spacing:-0.02em;"> ACADEMY</span>
  </div>
  <div style="padding:32px;">
    <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#F5F5F5;">${title}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.7;">${message}</p>
    ${link ? `<a href="${SITE_URL}${link}" style="display:inline-block;padding:12px 28px;background:#D59C10;border-radius:50px;font-size:14px;font-weight:700;color:#1A1D21;text-decoration:none;">View in Academy</a>` : ''}
  </div>
  <div style="padding:20px 32px;border-top:1px solid #2A2F35;">
    <p style="margin:0;font-size:12px;color:#3A3F46;">You are receiving this because you have an account on Daintymindz Academy.</p>
  </div>
</div></body></html>`;
}

async function sendEmail(to: string, subject: string, message: string, link?: string) {
  if (!resend) return;
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html: emailHtml(subject, message, link) });
  } catch (e) {
    console.error('Email send error:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, adminBroadcast, excludeUserId, type, title, message, link } = await req.json();
    const supabase = createServiceClient();

    if (adminBroadcast) {
      const { data: admins } = await supabase.from('profiles').select('id').eq('is_admin', true);
      for (const admin of (admins || []).filter(admin => admin.id !== excludeUserId)) {
        await supabase.from('notifications').insert({ user_id: admin.id, type, title, message, link });
        const { data: { user } } = await supabase.auth.admin.getUserById(admin.id);
        if (user?.email) await sendEmail(user.email, title, message, link);
      }
    } else if (userId) {
      await supabase.from('notifications').insert({ user_id: userId, type, title, message, link });
      const { data: { user } } = await supabase.auth.admin.getUserById(userId);
      if (user?.email) await sendEmail(user.email, title, message, link);
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error('notify route error:', e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
