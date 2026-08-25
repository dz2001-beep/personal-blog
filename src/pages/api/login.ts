import type { APIRoute } from 'astro';
import { verifyLogin, createSession, SESSION_COOKIE } from '../../lib/auth';
import { json, readJson } from '../../lib/http';

// 简易登录限流(内存)
const attempts = new Map<string, { count: number; first: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  const ip = clientAddress || 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now - rec.first < WINDOW_MS && rec.count >= MAX_ATTEMPTS) {
    return json({ error: '尝试次数过多,请 5 分钟后再试' }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch {
    return json({ error: '请求格式错误' }, 400);
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (!username || !password) {
    return json({ error: '请输入用户名和密码' }, 400);
  }

  if (verifyLogin(username, password)) {
    attempts.delete(ip);
    const token = createSession(username);
    cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return json({ ok: true });
  }

  const a = attempts.get(ip) ?? { count: 0, first: now };
  attempts.set(ip, { count: a.count + 1, first: a.first });
  return json({ error: '用户名或密码错误' }, 401);
};
