/**
 * 高级交互动效:
 * 1. 滚动视差 — 向下滚动时封面内容上移淡出,背景图轻微放大
 * 2. 3D 倾斜 — 鼠标在卡片上移动时轻微透视倾斜(桌面端)
 * 3. 数字滚动 — 统计数字进入视口时从 0 递增
 * 4. 事件监听全局只绑定一次,页面跳转后自动重新抓取元素
 * 5. 系统「减少动态效果」时全部禁用
 */

declare global {
  interface Window {
    __fxInit?: boolean;
  }
}

let bound = false;
let coverEl: HTMLElement | null = null;
let coverInnerEl: HTMLElement | null = null;
let coverBgEl: HTMLElement | null = null;
let tiltedEl: HTMLElement | null = null;

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = () => window.matchMedia('(pointer: coarse)').matches;

/* ---------- 滚动视差 ---------- */
function onScroll(): void {
  if (!coverEl || !coverInnerEl) return;
  const y = window.scrollY;
  const h = coverEl.offsetHeight || 1;
  if (y > h + 80) return;
  const progress = Math.min(1, y / h);
  coverInnerEl.style.transform = `translateY(${(progress * 90).toFixed(1)}px)`;
  coverInnerEl.style.opacity = String(Math.max(0, 1 - progress * 1.45));
  if (coverBgEl) coverBgEl.style.transform = `scale(${(1 + progress * 0.06).toFixed(3)})`;
}

/* ---------- 3D 倾斜 ---------- */
const TILT_MAX = 3.2;

function resetTilt(): void {
  if (tiltedEl) {
    tiltedEl.style.transform = '';
    tiltedEl = null;
  }
}

function onTiltMove(e: MouseEvent): void {
  const target = e.target as HTMLElement | null;
  const el = target?.closest?.('[data-tilt]') as HTMLElement | null;
  if (tiltedEl && tiltedEl !== el) resetTilt();
  if (!el) return;
  tiltedEl = el;
  const rect = el.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width - 0.5;
  const py = (e.clientY - rect.top) / rect.height - 0.5;
  const rx = (-py * TILT_MAX).toFixed(2);
  const ry = (px * TILT_MAX).toFixed(2);
  el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
}

/* ---------- 数字滚动 ---------- */
function countUp(el: HTMLElement): void {
  const target = Number(el.dataset.count || '0');
  if (!Number.isFinite(target) || target <= 0) return;
  const duration = 1100;
  const start = performance.now();
  el.textContent = '0';
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

let countObserver: IntersectionObserver | null = null;

function observeCounters(): void {
  if (!countObserver) {
    countObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            countUp(entry.target as HTMLElement);
            countObserver?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.6 }
    );
  }
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    if (el.dataset.counted === '1') return;
    el.dataset.counted = '1';
    countObserver!.observe(el);
  });
}

/* ---------- 初始化(事件只绑一次,元素每次跳转后刷新) ---------- */
function bindEvents(): void {
  if (bound) return;
  bound = true;
  window.addEventListener('scroll', onScroll, { passive: true });
  if (!coarse()) {
    document.addEventListener('mousemove', onTiltMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', resetTilt);
  }
}

function refresh(): void {
  if (reduced()) return;
  bindEvents();

  coverEl = document.getElementById('cover');
  coverInnerEl = coverEl?.querySelector('.cover-inner') ?? null;
  coverBgEl = coverEl?.querySelector('.cover-bg') ?? null;
  onScroll();
  observeCounters();
}

refresh();
document.addEventListener('astro:page-load', refresh);
