import type { APIRoute } from 'astro';
import { updateWork, deleteWork, getWorkBySlug } from '../../../../lib/db';
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

  let slug = genSlug('w', String(body.slug || ''));
  const existing = getWorkBySlug(slug);
  if (existing && existing.id !== id) slug = `${slug}-${Date.now().toString(36)}`;

  updateWork(id, {
    slug,
    title,
    description: String(body.description || ''),
    content: String(body.content || ''),
    tech: Array.isArray(body.tech) ? body.tech.map(String) : [],
    demo_url: String(body.demo_url || ''),
    repo_url: String(body.repo_url || ''),
    featured: Boolean(body.featured),
  });

  return json({ ok: true, slug });
};

export const DELETE: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: '参数错误' }, 400);
  deleteWork(id);
  return json({ ok: true });
};
