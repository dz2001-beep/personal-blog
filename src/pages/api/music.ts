import type { APIRoute } from 'astro';
import { getPlaylist } from '../../lib/music';

/**
 * GET /api/music
 * 返回抓取到的网络歌单(服务端缓存 10 分钟)
 * 参数:?refresh=1 强制刷新
 */
export const GET: APIRoute = async ({ url }) => {
  const refresh = url.searchParams.get('refresh') === '1';
  const data = await getPlaylist({ refresh });

  return new Response(JSON.stringify(data), {
    status: data.ok ? 200 : 502,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // 浏览器侧也缓存一小会儿,减少刷新时的抖动
      'Cache-Control': 'public, max-age=60',
    },
  });
};
