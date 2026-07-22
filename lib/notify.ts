export async function notify(payload: {
  userId?: string;
  adminBroadcast?: boolean;
  excludeUserId?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('notify error:', e);
  }
}
