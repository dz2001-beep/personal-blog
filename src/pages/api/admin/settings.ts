import type { APIRoute } from 'astro';
import { setSetting } from '../../../lib/db';
import { json, readJson } from '../../../lib/http';

const STRING_FIELDS = ['title', 'description', 'author', 'url', 'heroTitle', 'heroTagline', 'shortName', 'bio'] as const;
const SOCIAL_FIELDS = ['github', 'email', 'twitter', 'juejin', 'zhihu'] as const;

export const PUT: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  for (const key of STRING_FIELDS) {
    if (typeof body[key] === 'string') setSetting(key, (body[key] as string).trim());
  }

  const social: Record<string, string> = {};
  for (const key of SOCIAL_FIELDS) {
    if (typeof body.social?.[key] === 'string') social[key] = (body.social[key] as string).trim();
  }
  if (Object.keys(social).length > 0) setSetting('social', JSON.stringify(social));

  return json({ ok: true });
};
