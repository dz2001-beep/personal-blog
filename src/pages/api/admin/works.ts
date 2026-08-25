import type { APIRoute } from 'astro';
import { createWork, getWorkBySlug } from '../../../lib/db';
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

  let slug = genSlug('w', String(body.slug || ''));
  while (getWorkBySlug(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const id = createWork({
    slug,
    title,
    description: String(body.description || ''),
    content: String(body.content || ''),
    tech: Array.isArray(body.tech) ? body.tech.map(String) : [],
    demo_url: String(body.demo_url || ''),
    repo_url: String(body.repo_url || ''),
    featured: Boolean(body.featured),
  });

  return json({ ok: true, id, slug });
};
