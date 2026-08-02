import { NextResponse } from 'next/server';
import { createSessionCookieValue, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '../../../lib/session';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const pin = String(body.pin || '');
  const correct = String(process.env.HOUSEHOLD_PIN || '');

  if (!correct) {
    return NextResponse.json({ error: 'HOUSEHOLD_PIN が未設定です' }, { status: 500 });
  }
  if (pin !== correct) {
    return NextResponse.json({ error: 'PINが違います' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, await createSessionCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE
  });
  return res;
}
