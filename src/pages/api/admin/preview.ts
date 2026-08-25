import type { APIRoute } from 'astro';
import { renderMarkdown } from '../../../lib/md';
import { json, readJson } from '../../../lib/http';

/** 后台编辑器实时预览:把 Markdown 渲染成 HTML */
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown>;
  try {
    body = await readJson(request);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
  const { html } = await renderMarkdown(String(body.content || ''));
  return json({ html });
};
