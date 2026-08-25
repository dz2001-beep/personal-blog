import type { APIRoute } from 'astro';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { setSetting } from '../../../lib/db';
import { json, readJson } from '../../../lib/http';

/** 上传目录:生产环境写到 dist/client/uploads,开发环境写到 public/uploads */
function getUploadsDir(): string {
  const root = process.cwd();
  const prodClient = path.join(root, 'dist', 'client');
  if (existsSync(prodClient)) return path.join(prodClient, 'uploads');
  return path.join(root, 'public', 'uploads');
}

const MAX_SIZE = 4 * 1024 * 1024; // 4MB

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const dataUrl = String(body.dataUrl || '');
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/);
  if (!m) return json({ error: '不支持的图片格式' }, 400);

  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > MAX_SIZE) return json({ error: '图片不能超过 4MB' }, 400);

  const dir = getUploadsDir();
  mkdirSync(dir, { recursive: true });
  const filename = `avatar.${ext}`;
  writeFileSync(path.join(dir, filename), buffer);

  setSetting('avatar', `/uploads/${filename}`);
  return json({ ok: true, avatar: `/uploads/${filename}` });
};
