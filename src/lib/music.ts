/**
 * 音乐歌单数据层(服务端)
 *
 * 思路:浏览器不直接依赖第三方接口 —— 由本站服务端抓取 Meting 歌单,
 * 规范化成统一结构后交给前端;这样能:
 *   1. 做内存缓存(默认 10 分钟),避免每次刷首页都打第三方;
 *   2. 主接口挂了自动切换备用接口;
 *   3. 抓取失败时回退到上一次的缓存(宁可用旧歌单,也不让播放器变空白);
 *   4. 提供 /api/music/stream 代理兜底(第三方 CDN 万一加防盗链也能播)。
 */
import { MUSIC } from '../data/widgets';

/** 一首歌:前端只认这几个字段 */
export interface Song {
  id: string;
  name: string;
  artist: string;
  album: string;
  pic: string;
  /** 播放地址:Meting 的 type=url,会 302 到音频 CDN(支持 Range 拖动) */
  url: string;
  /** 兜底播放地址:走本站服务端代理 */
  stream: string;
}

export interface PlaylistPayload {
  ok: boolean;
  server: string;
  listId: string;
  name: string;
  /** 抓取时间戳(毫秒) */
  updatedAt: number;
  /** 歌单总数(未截断前) */
  total: number;
  /** 是否命中缓存 */
  cached: boolean;
  /** 是否是抓取失败后回退的旧数据 */
  stale: boolean;
  /** 实际抓取成功的接口 */
  source: string;
  songs: Song[];
  error?: string;
}

const TTL = Math.max(1, MUSIC.cacheMinutes ?? 10) * 60 * 1000;

/** 内存缓存:key = server:listId */
const cache = new Map<string, { at: number; data: PlaylistPayload }>();
/** 并发去重:同一时刻只发一次抓取 */
const pending = new Map<string, Promise<PlaylistPayload>>();

function cacheKey(server: string, listId: string): string {
  return `${server}:${listId}`;
}

function buildMetingUrl(api: string, server: string, type: string, id: string): string {
  const base = api.endsWith('/') ? api : `${api}/`;
  const qs = new URLSearchParams({ server, type, id });
  return `${base}?${qs.toString()}`;
}

/** 从 Meting 返回的 url 里抠出歌曲 ID(兼容 &id= / ?id= 两种写法) */
function pickId(url: unknown): string {
  const m = /[?&]id=(\d+)/.exec(String(url ?? ''));
  return m ? m[1] : '';
}

/** 洗掉 HTML 实体和多余空白 */
function cleanText(input: unknown): string {
  return String(input ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

interface RawSong {
  name?: string;
  artist?: string;
  album?: string;
  pic?: string;
  url?: string;
}

/** 把 Meting 的原始数组规范化 + 去重 + 限流 */
function normalizeSongs(raw: unknown[], limit: number): Song[] {
  const out: Song[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const s = item as RawSong;
    const id = pickId(s.url);
    if (!id || seen.has(id)) continue;

    const name = cleanText(s.name);
    if (!name) continue;

    seen.add(id);
    out.push({
      id,
      name,
      artist: cleanText(s.artist) || '未知歌手',
      album: cleanText(s.album),
      pic: String(s.pic ?? ''),
      url: String(s.url ?? ''),
      stream: `/api/music/stream?server=${encodeURIComponent(MUSIC.server)}&id=${encodeURIComponent(id)}`,
    });

    if (out.length >= limit) break;
  }

  return out;
}

async function fetchOnce(api: string, server: string, listId: string, limit: number, signal: AbortSignal) {
  const url = buildMetingUrl(api, server, 'playlist', listId);
  const res = await fetch(url, {
    signal,
    headers: {
      // 部分实例会校验来源,带上常规 UA 更稳
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
      Accept: 'application/json,text/plain,*/*',
    },
  });

  if (!res.ok) throw new Error(`${api} 返回 ${res.status}`);

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${api} 返回的不是 JSON`);
  }

  if (!Array.isArray(data)) throw new Error(`${api} 数据结构异常`);
  const songs = normalizeSongs(data, limit);
  if (songs.length === 0) throw new Error(`${api} 没有解析出歌曲`);
  return { songs, total: data.length };
}

/** 抓取歌单(带缓存 + 多接口回退 + 失败用旧缓存) */
export async function getPlaylist(opts: { refresh?: boolean } = {}): Promise<PlaylistPayload> {
  const server = MUSIC.server;
  const listId = MUSIC.listId;
  const limit = Math.max(1, MUSIC.limit ?? 100);
  const key = cacheKey(server, listId);

  const hit = cache.get(key);
  if (!opts.refresh && hit && Date.now() - hit.at < TTL) {
    return { ...hit.data, cached: true };
  }

  const running = pending.get(key);
  if (running) return running;

  const task = (async (): Promise<PlaylistPayload> => {
    const errors: string[] = [];

    for (const api of MUSIC.apis) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        let result;
        try {
          result = await fetchOnce(api, server, listId, limit, controller.signal);
        } finally {
          clearTimeout(timer);
        }

        const payload: PlaylistPayload = {
          ok: true,
          server,
          listId,
          name: MUSIC.listName || '网络歌单',
          updatedAt: Date.now(),
          total: result.total,
          cached: false,
          stale: false,
          source: api,
          songs: result.songs,
        };
        cache.set(key, { at: Date.now(), data: payload });
        return payload;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    // 全部接口失败:有旧缓存就先用旧的
    if (hit) {
      return { ...hit.data, cached: true, stale: true, error: errors.join('; ') };
    }

    return {
      ok: false,
      server,
      listId,
      name: MUSIC.listName || '网络歌单',
      updatedAt: Date.now(),
      total: 0,
      cached: false,
      stale: false,
      source: '',
      songs: [],
      error: errors.join('; ') || '歌单抓取失败',
    };
  })().finally(() => pending.delete(key));

  pending.set(key, task);
  return task;
}

/**
 * 打开音频流(供 /api/music/stream 代理使用)
 * 依次尝试各接口,返回上游响应(保留 Range 语义),失败返回 null
 */
export async function openAudio(server: string, id: string, range?: string | null): Promise<Response | null> {
  for (const api of MUSIC.apis) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
          Referer: 'https://music.163.com/',
          Accept: '*/*',
        };
        if (range) headers.Range = range;

        const res = await fetch(buildMetingUrl(api, server, 'url', id), {
          headers,
          redirect: 'follow',
          signal: controller.signal,
        });

        const type = res.headers.get('content-type') ?? '';
        if (res.ok && (type.includes('audio') || type.includes('octet-stream'))) return res;
        // 上游给了 200 但其实是 HTML 错误页 —— 换下一个接口
        await res.body?.cancel().catch(() => {});
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // 换下一个接口
    }
  }
  return null;
}
