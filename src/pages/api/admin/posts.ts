import type { APIRoute } from 'astro';
import { createPost, getPostBySlug } from '../../../lib/db';
import { json, readJson, genSlug } from '../../../lib/http';

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  const title = String(body.title || '').trim();
  if (!title) return json({ error: '标题不能为空' }, 400);

  let slug = genSlug('p', String(body.slug || ''));
  while (getPostBySlug(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const id = createPost({
    slug,
    title,
    description: String(body.description || ''),
    content: String(body.content || ''),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    status: body.status === 'draft' ? 'draft' : 'published',
  });

  return json({ ok: true, id, slug });
};
