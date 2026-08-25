/**
 * 全局交互脚本(在 BaseLayout 中引入,整个站点生效)
 * - 头像:本地上传(localStorage)、全站同步、恢复默认
 * - 滚动渐显(IntersectionObserver)
 * - 阅读进度条、回到顶部
 * - Hero 打字机效果
 * - 文章实时搜索
 */

const AVATAR_KEY = 'blog:avatar';
let initialized = false;

/* ---------- 头像 ---------- */

/** 把所有 .avatar-img 的 src 同步为本地头像(无则用默认) */
function syncAvatars(): void {
  const saved = localStorage.getItem(AVATAR_KEY);
  document.querySelectorAll<HTMLImageElement>('.avatar-img').forEach((img) => {
    img.src = saved || img.dataset.fallback || '/avatar.svg';
  });
}

/** 把图片文件居中裁切成正方形并压缩为 512px 的 dataURL */
function processImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read error'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode error'));
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no canvas'));
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512);
        resolve(canvas.toDataURL('image/webp', 0.86));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

let toastTimer = 0;

function showToast(text: string): void {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast?.classList.remove('show'), 2200);
}

function onDocumentClick(e: Event): void {
  const target = e.target as HTMLElement;
  const uploadBtn = target.closest<HTMLElement>('[data-avatar-upload]');
  if (uploadBtn) {
    const input = document.querySelector<HTMLInputElement>('[data-avatar-input]');
    input?.click();
    return;
  }
  const resetBtn = target.closest<HTMLElement>('[data-avatar-reset]');
  if (resetBtn) {
    localStorage.removeItem(AVATAR_KEY);
    syncAvatars();
    showToast('已恢复默认头像');
  }
}

async function onFileChange(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件');
    return;
  }
  try {
    const dataUrl = await processImage(file);
    localStorage.setItem(AVATAR_KEY, dataUrl);
    syncAvatars();
    showToast('头像已更新 ✨');
  } catch {
    showToast('图片处理失败,请换一张试试');
  } finally {
    input.value = '';
  }
}

/* ---------- 滚动渐显 ---------- */

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
);

function initReveal(): void {
  document.querySelectorAll('.reveal:not(.revealed)').forEach((el) => revealObserver.observe(el));
}

/* ---------- 阅读进度条 & 回到顶部 ---------- */

function updateProgress(): void {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const p = max > 0 ? doc.scrollTop / max : 0;
  bar.style.transform = `scaleX(${p})`;
}

function updateBackToTop(): void {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  btn.classList.toggle('show', document.documentElement.scrollTop > 360);
}

function onScroll(): void {
  updateProgress();
  updateBackToTop();
}

function onBackToTopClick(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Hero 打字机 ---------- */

function initTypewriter(): void {
  const el = document.getElementById('typed');
  if (!el || el.dataset.done) return;
  const full = el.dataset.text || '';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced || full.length === 0) {
    el.textContent = full;
    el.dataset.done = '1';
    el.closest('.hero-title')?.classList.add('typed-done');
    return;
  }

  let i = 0;
  const timer = window.setInterval(() => {
    i += 1;
    el.textContent = full.slice(0, i);
    if (i >= full.length) {
      window.clearInterval(timer);
      el.dataset.done = '1';
      el.closest('.hero-title')?.classList.add('typed-done');
    }
  }, 95);
}

/* ---------- 文章实时搜索 ---------- */

function filterPosts(query: string): void {
  const q = query.trim().toLowerCase();
  const items = document.querySelectorAll<HTMLElement>('.post-list .post-card');
  const empty = document.getElementById('search-empty');
  let visible = 0;

  items.forEach((card) => {
    const haystack = (card.dataset.search || '').toLowerCase();
    const match = !q || haystack.includes(q);
    card.style.display = match ? '' : 'none';
    if (match) visible += 1;
  });

  if (empty) empty.classList.toggle('show', q.length > 0 && visible === 0);
}

function onDocumentInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  if (target.id === 'search-input') filterPosts(target.value);
}

/* ---------- 初始化(幂等,配合 View Transitions) ---------- */

function run(): void {
  syncAvatars();
  initReveal();
  updateProgress();
  updateBackToTop();
  initTypewriter();
}

if (!initialized) {
  initialized = true;
  document.addEventListener('astro:page-load', run);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('change', onFileChange);
  document.addEventListener('input', onDocumentInput);
  window.addEventListener('scroll', onScroll, { passive: true });
  run();
}
