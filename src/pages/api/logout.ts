import type { APIRoute } from 'astro';
import { SESSION_COOKIE } from '../../lib/auth';
import { json } from '../../lib/http';

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return json({ ok: true });
};
