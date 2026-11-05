/**
 * 网络歌单播放器(首页 / 文章列表页侧栏)
 *
 * - 歌单由服务端 /api/music 抓取并缓存,前端只负责渲染和播放
 * - 支持:选歌、播放/暂停、上一首/下一首、进度拖动、音量、歌单搜索
 * - 第三方音频源播放失败时,自动切到本站 /api/music/stream 代理再试一次
 * - 配合 <ClientRouter> + transition:persist:切页面时音乐不中断
 */

interface Song {
  id: string;
  name: string;
  artist: string;
  album?: string;
  pic?: string;
  url: string;
  stream?: string;
}

interface PlaylistResponse {
  ok: boolean;
  name?: string;
  songs?: Song[];
  error?: string;
  stale?: boolean;
  total?: number;
}

const VOLUME_KEY = 'blog:music:volume';
const LAST_KEY = 'blog:music:last';
const OPEN_KEY = 'blog:music:open';

interface PlayerState {
  songs: Song[];
  idx: number;
  usingFallback: boolean;
  filter: string;
  dragging: boolean;
}

const state: PlayerState = {
  songs: [],
  idx: -1,
  usingFallback: false,
  filter: '',
  dragging: false,
};

let bound = false;
let loading = false;

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function el<T extends HTMLElement>(id: string): T | null {
  return document.querySelector<T>(`#${id}`);
}

function setText(id: string, text: string): void {
  const node = el(id);
  if (node) node.textContent = text;
}

/** 播放/暂停按钮图标 */
function syncPlayButton(playing: boolean): void {
  const btn = el<HTMLButtonElement>('mt-play');
  if (!btn) return;
  btn.textContent = playing ? '❚❚' : '▶';
  btn.classList.toggle('is-playing', playing);
  btn.setAttribute('aria-label', playing ? '暂停' : '播放');
  const card = el('music-player');
  card?.classList.toggle('is-playing', playing);
}

/** 渲染歌单列表 */
function renderList(): void {
  const list = el<HTMLUListElement>('mt-list');
  if (!list) return;

  const keyword = state.filter.trim().toLowerCase();
  const items = state.songs
    .map((song, index) => ({ song, index }))
    .filter(({ song }) => {
      if (!keyword) return true;
      return `${song.name} ${song.artist}`.toLowerCase().includes(keyword);
    });

  const frag = document.createDocumentFragment();
  if (items.length === 0) {
    const li = document.createElement('li');
    li.className = 'music-list-empty';
    li.textContent = state.songs.length === 0 ? '歌单为空' : '没有匹配的歌曲';
    frag.appendChild(li);
  }

  for (const { song, index } of items) {
    const li = document.createElement('li');
    li.className = 'music-item';
    li.dataset.index = String(index);
    if (index === state.idx) li.classList.add('is-active');
    li.setAttribute('role', 'button');
    li.tabIndex = 0;
    li.title = `${song.name} - ${song.artist}`;

    li.innerHTML =
      `<span class="music-item-idx">${String(index + 1).padStart(2, '0')}</span>` +
      `<span class="music-item-text"><span class="music-item-name"></span>` +
      `<span class="music-item-artist"></span></span>` +
      `<span class="music-item-eq" aria-hidden="true"><i></i><i></i><i></i></span>`;

    // 用 textContent 赋值,避免歌名里的特殊字符被当成 HTML
    const nameNode = li.querySelector<HTMLElement>('.music-item-name');
    const artistNode = li.querySelector<HTMLElement>('.music-item-artist');
    if (nameNode) nameNode.textContent = song.name;
    if (artistNode) artistNode.textContent = song.artist;

    frag.appendChild(li);
  }

  list.replaceChildren(frag);
  setText('mt-count', `${state.songs.length} 首`);
}

/** 高亮当前行 */
function syncActiveRow(scroll = false): void {
  document.querySelectorAll<HTMLElement>('.music-item').forEach((node) => {
    const active = Number(node.dataset.index) === state.idx;
    node.classList.toggle('is-active', active);
    if (active && scroll) node.scrollIntoView({ block: 'nearest' });
  });
}

/** 更新歌曲信息区 */
function syncMeta(): void {
  const song = state.songs[state.idx];
  if (!song) return;

  setText('mt-title', song.name);
  setText('mt-artist', song.artist);

  const pic = el<HTMLImageElement>('mt-pic');
  const cover = el('mt-cover');
  if (pic && cover) {
    if (song.pic) {
      pic.src = song.pic;
      cover.classList.remove('is-empty');
    } else {
      pic.removeAttribute('src');
      cover.classList.add('is-empty');
    }
  }

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.name,
        artist: song.artist,
        album: song.album || '',
        artwork: song.pic ? [{ src: song.pic, sizes: '300x300', type: 'image/jpeg' }] : [],
      });
    } catch {
      /* 忽略:部分浏览器不支持 */
    }
  }

  try {
    localStorage.setItem(LAST_KEY, song.id);
  } catch {
    /* 隐私模式下可能失败 */
  }
}

/** 连续播放失败的次数(防止所有音源都挂时无限跳歌) */
let failStreak = 0;

/**
 * 用户"想听"的标志位。
 * 网络音源普遍偏慢(一首 8~10MB),刚设置 src 时 play() 常被浏览器以 AbortError
 * 打断 —— 这不代表播不了,所以只记下"想播",等 canplay/loadeddata 事件触发时
 * 再自动续播;真正的失败由音频元素的 error 事件判定。
 */
let wantPlaying = false;

/** 元数据还没加载完时用户拖动的目标位置,等 loadedmetadata 后补上 */
let pendingSeek: number | null = null;

/** 设置音源并发起播放(不在这里判失败) */
function playUrl(url: string): void {
  const audio = el<HTMLAudioElement>('mt-audio');
  if (!audio) return;

  wantPlaying = true;
  audio.src = url;
  audio.preload = 'auto';

  void audio.play().catch(() => {
    // 中断/缓冲中:交给 canplay 续播;只有媒体真的出错才走兜底
    if (audio.error) handleError();
  });
}

/** 选中第 index 首;autoplay 为真时立即播放 */
function select(index: number, autoplay = true): void {
  const audio = el<HTMLAudioElement>('mt-audio');
  const song = state.songs[index];
  if (!audio || !song) return;

  state.idx = index;
  state.usingFallback = false;
  pendingSeek = null;

  syncMeta();
  syncActiveRow(true);
  syncSeekUI(0, 0);

  if (autoplay) {
    playUrl(song.url);
  } else {
    // 只预载元数据,不自动播放(浏览器会拦截没有用户手势的自动播放)
    wantPlaying = false;
    audio.src = song.url;
    audio.preload = 'metadata';
    void audio.load?.();
  }
}

/** 播放失败兜底:切到本站代理再试一次 */
function handleError(): void {
  const song = state.songs[state.idx];
  if (!song) return;

  el('music-player')?.classList.remove('is-loading');

  // 1) 第三方音源失败 → 换成本站 /api/music/stream 代理再试
  if (!state.usingFallback && song.stream) {
    state.usingFallback = true;
    setText('mt-artist', '正在切换备用音源…');
    playUrl(song.stream);
    return;
  }

  // 2) 代理也失败:连续失败则停下来,避免无限跳歌
  failStreak += 1;
  wantPlaying = false;
  syncPlayButton(false);
  setText('mt-artist', '这首歌暂时播不了');

  if (failStreak >= 3 || state.songs.length <= 1) return;

  setTimeout(() => {
    const next = (state.idx + 1) % state.songs.length;
    select(next, true);
  }, 900);
}

function step(delta: number): void {
  if (state.songs.length === 0) return;
  const next = (state.idx + delta + state.songs.length) % state.songs.length;
  select(next, true);
}

function syncSeekUI(current: number, duration: number): void {
  const seek = el<HTMLInputElement>('mt-seek');
  if (seek) {
    seek.max = String(duration || 0);
    if (!state.dragging) seek.value = String(current || 0);
  }
  setText('mt-cur', fmt(current));
  setText('mt-dur', fmt(duration));
}

/** 拉取歌单 */
async function loadPlaylist(): Promise<void> {
  if (loading) return;
  loading = true;

  const card = el('music-player');
  card?.classList.add('is-loading');
  setText('mt-title', '正在加载歌单…');
  setText('mt-artist', '请稍候');
  setText('mt-count', '加载中');

  try {
    const res = await fetch('/api/music', { headers: { Accept: 'application/json' } });
    const data = (await res.json()) as PlaylistResponse;

    if (!data.ok || !data.songs || data.songs.length === 0) {
      throw new Error(data.error || '歌单为空');
    }

    state.songs = data.songs;
    if (data.name) setText('mt-list-name', data.name);
    renderList();

    // 恢复上次播放的歌曲(只选中,不自动播放 —— 浏览器会拦截自动播放)
    let startIndex = 0;
    try {
      const lastId = localStorage.getItem(LAST_KEY);
      if (lastId) {
        const found = state.songs.findIndex((s) => s.id === lastId);
        if (found >= 0) startIndex = found;
      }
    } catch {
      /* 忽略 */
    }

    select(startIndex, false);
    card?.classList.remove('is-loading');
  } catch (err) {
    card?.classList.remove('is-loading');
    setText('mt-title', '歌单加载失败');
    setText('mt-artist', err instanceof Error ? err.message : '请稍后重试');
    setText('mt-count', '');
    const list = el<HTMLUListElement>('mt-list');
    if (list) {
      const li = document.createElement('li');
      li.className = 'music-list-empty';
      li.textContent = '点击上方「重试」再试一次';
      list.replaceChildren(li);
    }
    el('mt-retry')?.removeAttribute('hidden');
  } finally {
    loading = false;
  }
}

/** 音量初始化与持久化 */
function initVolume(audio: HTMLAudioElement): void {
  let saved = 0.8;
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw !== null) {
      const num = Number(raw);
      if (Number.isFinite(num) && num >= 0 && num <= 1) saved = num;
    }
  } catch {
    /* 忽略 */
  }

  audio.volume = saved;
  const vol = el<HTMLInputElement>('mt-vol');
  if (vol) vol.value = String(saved);

  vol?.addEventListener('input', () => {
    const value = Number(vol.value);
    audio.volume = value;
    audio.muted = false;
    syncMuteIcon(audio);
    try {
      localStorage.setItem(VOLUME_KEY, String(value));
    } catch {
      /* 忽略 */
    }
  });
}

function syncMuteIcon(audio: HTMLAudioElement): void {
  const btn = el('mt-mute');
  if (!btn) return;
  btn.textContent = audio.muted || audio.volume === 0 ? '🔇' : '🔊';
  btn.setAttribute('aria-label', audio.muted ? '取消静音' : '静音');
}

/** 绑定所有交互(只绑一次) */
function bind(): void {
  const audio = el<HTMLAudioElement>('mt-audio');
  const card = el('music-player');
  if (!audio || !card) return;

  initVolume(audio);
  syncMuteIcon(audio);

  // 播放 / 暂停
  el('mt-play')?.addEventListener('click', () => {
    if (state.songs.length === 0) {
      void loadPlaylist();
      return;
    }
    if (audio.paused) {
      // 没设过音源(刚打开页面)就先选中当前歌曲
      if (!audio.src) {
        select(Math.max(0, state.idx), true);
        return;
      }
      wantPlaying = true;
      void audio.play().catch(() => {
        // 缓冲中不算失败:canplay 时会自动续播
        if (audio.error) handleError();
      });
    } else {
      wantPlaying = false;
      audio.pause();
    }
  });

  el('mt-prev')?.addEventListener('click', () => step(-1));
  el('mt-next')?.addEventListener('click', () => step(1));
  el('mt-mute')?.addEventListener('click', () => {
    audio.muted = !audio.muted;
    syncMuteIcon(audio);
  });
  el('mt-retry')?.addEventListener('click', () => {
    el('mt-retry')?.setAttribute('hidden', '');
    void loadPlaylist();
  });

  // 歌单面板展开 / 收起
  const listWrap = el('mt-list-wrap');
  el('mt-toggle')?.addEventListener('click', () => {
    if (!listWrap) return;
    const open = listWrap.hasAttribute('hidden');
    listWrap.toggleAttribute('hidden', !open);
    el('mt-toggle')?.classList.toggle('is-open', open);
    try {
      localStorage.setItem(OPEN_KEY, open ? '1' : '0');
    } catch {
      /* 忽略 */
    }
  });

  // 搜索过滤
  const search = el<HTMLInputElement>('mt-search');
  search?.addEventListener('input', () => {
    state.filter = search.value;
    renderList();
  });

  // 点击列表选歌(事件委托)
  const list = el<HTMLUListElement>('mt-list');
  const pickFromEvent = (event: Event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('.music-item');
    if (!target) return;
    const index = Number(target.dataset.index);
    if (Number.isInteger(index) && index >= 0) select(index, true);
  };
  list?.addEventListener('click', pickFromEvent);
  list?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      pickFromEvent(event);
    }
  });

  // 进度条:拖动时暂停跟随,松手后跳转
  const seek = el<HTMLInputElement>('mt-seek');
  seek?.addEventListener('pointerdown', () => {
    state.dragging = true;
  });
  seek?.addEventListener('input', () => {
    setText('mt-cur', fmt(Number(seek.value)));
  });
  seek?.addEventListener('change', () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const wanted = Number(seek.value);

    if (duration > 0) {
      audio.currentTime = Math.min(wanted, duration);
      pendingSeek = null;
    } else {
      // 元数据还没到(刚切歌/缓冲中),先记住目标位置,等 loadedmetadata 再跳
      pendingSeek = wanted;
    }

    state.dragging = false;
    syncSeekUI(audio.currentTime, duration);
  });
  seek?.addEventListener('pointerup', () => {
    state.dragging = false;
  });

  // 音频事件
  audio.addEventListener('play', () => syncPlayButton(true));
  audio.addEventListener('pause', () => syncPlayButton(false));
  audio.addEventListener('emptied', () => card.classList.remove('is-loading'));
  audio.addEventListener('waiting', () => card.classList.add('is-loading'));
  audio.addEventListener('playing', () => {
    card.classList.remove('is-loading');
    failStreak = 0;
    // 备用音源切换成功后,把歌手名恢复回来
    const song = state.songs[state.idx];
    if (song) setText('mt-artist', song.artist);
  });
  // 关键:缓冲就绪后,如果用户想听就自动续播(应对 play() 被 AbortError 打断)
  const resumeIfWanted = () => {
    if (wantPlaying && audio.paused && !audio.error) {
      void audio.play().catch(() => {
        /* 还没真正就绪,等下一次 canplay */
      });
    }
  };
  audio.addEventListener('canplay', () => {
    card.classList.remove('is-loading');
    resumeIfWanted();
  });
  audio.addEventListener('loadeddata', resumeIfWanted);
  audio.addEventListener('loadedmetadata', () => {
    if (pendingSeek !== null && Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = Math.min(pendingSeek, audio.duration);
      pendingSeek = null;
    }
    syncSeekUI(audio.currentTime, audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    if (!state.dragging) syncSeekUI(audio.currentTime, audio.duration);
  });
  audio.addEventListener('ended', () => step(1));
  audio.addEventListener('error', () => handleError());

  // 系统媒体控制(耳机/锁屏/系统面板)
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => void audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
      navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
    } catch {
      /* 忽略 */
    }
  }

  // 恢复歌单面板展开状态
  try {
    if (localStorage.getItem(OPEN_KEY) === '1') {
      listWrap?.removeAttribute('hidden');
      el('mt-toggle')?.classList.add('is-open');
    }
  } catch {
    /* 忽略 */
  }

  bound = true;
}

function init(): void {
  const card = el('music-player');
  if (!card) return;

  // transition:persist 会让节点跨页保留,避免重复绑事件
  if (bound || card.dataset.bound === '1') return;
  card.dataset.bound = '1';

  bind();
  void loadPlaylist();
}

// 首屏 + 每次客户端路由切换后都检查(元素不存在时自动跳过)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
document.addEventListener('astro:page-load', init);
