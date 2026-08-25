/**
 * 认证:scrypt 密码哈希 + HMAC 签名会话 Cookie(无状态)
 */
import { scryptSync, randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { getSetting, setSetting, getUserByUsername } from './db';

const SESSION_COOKIE = 'blog_session';
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30; // 30 天

/* ---------- 密码 ---------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function verifyLogin(username: string, password: string): boolean {
  const user = getUserByUsername(username);
  if (!user) return false;
  return verifyPassword(password, user.password_hash);
}

/* ---------- 会话 ---------- */

function getSecret(): string {
  const existing = getSetting('session_secret');
  if (existing) return existing;
  const secret = randomBytes(32).toString('hex');
  setSetting('session_secret', secret);
  return secret;
}

export function createSession(username: string): string {
  const expires = Date.now() + SESSION_TTL;
  const payload = `${username}.${expires}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** 校验会话,返回用户名(无效返回 null) */
export function verifySession(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [username, exp, sig] = parts as [string, string, string];
  const expected = createHmac('sha256', getSecret()).update(`${username}.${exp}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Date.now() > Number(exp)) return null;
  return username;
}

export { SESSION_COOKIE };
