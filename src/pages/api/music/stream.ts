import type { APIRoute } from 'astro';
import { MUSIC } from '../../../data/widgets';
import { openAudio } from '../../../lib/music';

/**
 * GET /api/music/stream?server=netease&id=287398
 *
 * 音频代理兜底:浏览器直连第三方 CDN 失败时,由本站服务端转发音频流。
 * 透传 Range / 206,保证进度条拖动、断点续播都能用。
 */
export const GET: APIRoute = async ({ request, url }) => {
  const id = (url.searchParams.get('id') ?? '').trim();
  const server = (url.searchParams.get('server') ?? MUSIC.server).trim();

  if (!/^\d+$/.test(id)) {
    return new Response('无效的歌曲 ID', { status: 400 });
  }

  const range = request.headers.get('range');
  const upstream = await openAudio(server, id, range);

  if (!upstream) {
    return new Response('音频源暂不可用', { status: 502 });
  }

  const headers = new Headers();
  for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes');
  if (!headers.has('content-type')) headers.set('content-type', 'audio/mpeg');
  // 浏览器可缓存一天;歌曲 ID 对应的音源是稳定的
  headers.set('cache-control', 'public, max-age=86400');

  return new Response(upstream.body, {
    status: upstream.status === 206 ? 206 : 200,
    headers,
  });
};
