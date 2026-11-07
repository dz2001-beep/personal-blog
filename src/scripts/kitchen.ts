/**
 * 厨房列表页交互
 *
 * 目标:点菜品只看详情,不跳页、不开新窗口、不产生历史记录堆积。
 * - 桌面:右侧面板原地切换(首次进入没有选中时显示提示)
 * - 移动:同一个面板变成底部抽屉,支持下滑关闭
 * - URL 用 replaceState 同步 ?dish=slug,方便复制分享且不污染返回键
 */
const MOBILE_QUERY = '(max-width: 1024px)';

let bound = false;
let activeSlug: string | null = null;

type El = HTMLElement;

const q = <T extends El = El>(selector: string): T | null => document.querySelector<T>(selector);
const qa = <T extends El = El>(selector: string): T[] => [...document.querySelectorAll<T>(selector)];

const cards = (): El[] => qa('[data-dish-card]');
const visibleCards = (): El[] => cards().filter((el) => !el.hidden);
const details = (): El[] => qa('[data-dish-detail]');

function isMobile(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function slugOf(card: El): string {
  return card.dataset.dishSlug ?? '';
}

/** 同步 URL(?dish=slug),用 replaceState 避免"返回"要点很多次 */
function syncUrl(slug: string | null): void {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set('dish', slug);
  else url.searchParams.delete('dish');
  window.history.replaceState({}, '', url);
}

function updateCounter(): void {
  const counter = q('[data-dish-count]');
  if (!counter) return;

  const visible = visibleCards();
  if (!activeSlug) {
    counter.textContent = visible.length > 0 ? `${visible.length} 道` : '—';
    return;
  }
  const index = visible.findIndex((card) => slugOf(card) === activeSlug);
  counter.textContent = index >= 0 ? `${index + 1} / ${visible.length}` : '—';
}

function openSheetUI(): void {
  if (!isMobile()) return;
  q('[data-dish-panel]')?.classList.add('is-open');
  const backdrop = q('[data-sheet-backdrop]');
  if (backdrop) backdrop.hidden = false;
  // 下一帧加 class 让过渡生效
  requestAnimationFrame(() => backdrop?.classList.add('is-open'));
  document.documentElement.classList.add('sheet-open');
}

function closeSheetUI(): void {
  q('[data-dish-panel]')?.classList.remove('is-open');
  const backdrop = q('[data-sheet-backdrop]');
  backdrop?.classList.remove('is-open');
  document.documentElement.classList.remove('sheet-open');
  window.setTimeout(() => {
    if (backdrop && !q('[data-dish-panel]')?.classList.contains('is-open')) backdrop.hidden = true;
  }, 320);
}

/** 打开某道菜:只切换面板内容 */
function openDish(slug: string, opts: { syncUrl?: boolean; scrollCard?: boolean } = {}): void {
  const { syncUrl: doSync = true, scrollCard = true } = opts;

  const target = details().find((el) => el.dataset.dishSlug === slug);
  if (!target) return;

  activeSlug = slug;
  details().forEach((el) => {
    el.hidden = el.dataset.dishSlug !== slug;
  });

  const placeholder = q('[data-dish-placeholder]');
  if (placeholder) placeholder.hidden = true;

  cards().forEach((card) => card.classList.toggle('is-active', slugOf(card) === slug));

  const scroller = q('[data-dish-scroll]');
  if (scroller) scroller.scrollTop = 0;

  updateCounter();
  openSheetUI();

  if (scrollCard) {
    const card = cards().find((el) => slugOf(el) === slug);
    card?.scrollIntoView({ block: 'nearest' });
  }

  if (doSync) syncUrl(slug);
}

/** 收起详情 */
function closeDish(): void {
  activeSlug = null;
  details().forEach((el) => {
    el.hidden = true;
  });
  const placeholder = q('[data-dish-placeholder]');
  if (placeholder) placeholder.hidden = false;
  cards().forEach((card) => card.classList.remove('is-active'));
  updateCounter();
  closeSheetUI();
  syncUrl(null);
}

/** 上一道 / 下一道(在"当前可见"范围内循环) */
function stepDish(delta: number): void {
  const visible = visibleCards();
  if (visible.length === 0) return;

  if (!activeSlug) {
    openDish(slugOf(visible[0]!), { scrollCard: false });
    return;
  }

  const index = visible.findIndex((card) => slugOf(card) === activeSlug);
  const next = (index + delta + visible.length) % visible.length;
  openDish(slugOf(visible[next]!), { scrollCard: true });
}

/** 筛选 */
function applyFilter(filter: string): void {
  qa('[data-filter]').forEach((chip) => {
    chip.classList.toggle('is-active', chip.dataset.filter === filter);
  });

  cards().forEach((card) => {
    const cardType = card.dataset.dishType ?? '';
    card.hidden = !(filter === 'all' || cardType === filter);
  });

  // 当前选中的菜被筛掉了就收起面板
  if (activeSlug) {
    const stillVisible = visibleCards().some((card) => slugOf(card) === activeSlug);
    if (!stillVisible) closeDish();
  }
  updateCounter();
}

/* ---------------- 移动端下滑关闭 ---------------- */
function bindSheetDrag(): void {
  const handle = q('[data-sheet-handle]');
  const panel = q('[data-dish-panel]');
  if (!handle || !panel || handle.dataset.dragBound === '1') return;
  handle.dataset.dragBound = '1';

  let startY = 0;
  let delta = 0;
  let dragging = false;

  handle.addEventListener('pointerdown', (event) => {
    if (!isMobile()) return;
    dragging = true;
    startY = event.clientY;
    delta = 0;
    panel.style.transition = 'none';
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    delta = Math.max(0, event.clientY - startY);
    panel.style.transform = `translateY(${delta}px)`;
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = '';
    panel.style.transform = '';
    if (delta > 90) closeDish();
  };

  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

function bind(): void {
  if (bound) return;
  bound = true;

  // 卡片点击:拦截默认跳转,改成面板展开
  // 注意:必须用捕获阶段 —— Astro 的 ClientRouter 也在 document 上监听 click,
  // 且它比本脚本先注册;只有捕获阶段才能抢在它前面 preventDefault,
  // 否则它会把链接当成普通站内跳转处理掉(整页换掉列表页)。
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const card = target?.closest<El>('[data-dish-card]');
    if (card) {
      event.preventDefault();
      openDish(slugOf(card));
      return;
    }

    if (target?.closest('[data-dish-prev]')) {
      event.preventDefault();
      stepDish(-1);
      return;
    }
    if (target?.closest('[data-dish-next]')) {
      event.preventDefault();
      stepDish(1);
      return;
    }
    if (target?.closest('[data-dish-close]')) {
      event.preventDefault();
      closeDish();
      return;
    }
    if (target?.closest('[data-sheet-backdrop]')) {
      closeDish();
      return;
    }

    const chip = target?.closest<El>('[data-filter]');
    if (chip) {
      applyFilter(chip.dataset.filter ?? 'all');
    }
  }, true);

  // 键盘:← → 切换,Esc 收起
  document.addEventListener('keydown', (event) => {
    if (!q('[data-dish-panel]')) return;
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (event.key === 'Escape' && activeSlug) {
      closeDish();
    } else if (event.key === 'ArrowRight') {
      stepDish(1);
    } else if (event.key === 'ArrowLeft') {
      stepDish(-1);
    }
  });

  bindSheetDrag();
}

/** 初始化(含深链 ?dish=slug) */
function init(): void {
  if (!q('[data-dish-panel]')) return;

  bind();
  bindSheetDrag();

  // 客户端路由切换后,卡片状态是新的:重置后再按 URL 恢复
  activeSlug = null;
  cards().forEach((card) => card.classList.remove('is-active'));

  const fromUrl = new URL(window.location.href).searchParams.get('dish');
  if (fromUrl) {
    openDish(fromUrl, { syncUrl: false, scrollCard: false });
  } else {
    updateCounter();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
document.addEventListener('astro:page-load', init);
