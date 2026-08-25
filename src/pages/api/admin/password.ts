import type { APIRoute } from 'astro';
import { verifyPassword } from '../../../lib/auth';
import { getUserByUsername, updatePassword } from '../../../lib/db';
import { json, readJson } from '../../../lib/http';

export const POST: APIRoute = async ({ request, locals }) => {
  const username = locals.username;
  if (!username) return json({ error: '未登录' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const current = String(body.current || '');
  const next = String(body.next || '');

  if (next.length < 6) return json({ error: '新密码至少 6 位' }, 400);

  const user = getUserByUsername(username);
  if (!user || !verifyPassword(current, user.password_hash)) {
    return json({ error: '当前密码不正确' }, 400);
  }

  updatePassword(username, next);
  return json({ ok: true });
};
