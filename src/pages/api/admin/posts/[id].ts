import type { APIRoute } from 'astro';
import { updatePost, deletePost, getPostBySlug } from '../../../../lib/db';
import { json, readJson, genSlug } from '../../../../lib/http';

export const PUT: APIRoute = async ({ request, params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: '参数错误' }, 400);

  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const title = String(body.title || '').trim();
  if (!title) return json({ error: '标题不能为空' }, 400);

  let slug = genSlug('p', String(body.slug || ''));
  const existing = getPostBySlug(slug);
  if (existing && existing.id !== id) slug = `${slug}-${Date.now().toString(36)}`;

  updatePost(id, {
    slug,
    title,
    description: String(body.description || ''),
    content: String(body.content || ''),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    status: body.status === 'draft' ? 'draft' : 'published',
  });

  return json({ ok: true, slug });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: '参数错误' }, 400);
  deletePost(id);
  return json({ ok: true });
};
