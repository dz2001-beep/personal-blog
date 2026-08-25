/**
 * 中间件:保护后台 /admin 与 /api/admin 路由
 */
import { defineMiddleware } from 'astro:middleware';
import { verifySession, SESSION_COOKIE } from './lib/auth';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (!isAdminPage && !isAdminApi) {
    return next();
  }

  // 公开的后台路径
  if (isAdminPage && PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return next();
  }

  const username = verifySession(context.cookies.get(SESSION_COOKIE)?.value);

  if (!username) {
    if (isAdminApi) {
      return new Response(JSON.stringify({ error: '未登录或会话已过期' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return context.redirect('/admin/login');
  }

  // 已登录用户访问登录页 → 直接进后台
  if (pathname === '/admin/login') {
    return context.redirect('/admin');
  }

  context.locals.username = username;
  return next();
});
