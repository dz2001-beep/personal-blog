/**
 * 内页小组件交互:实时时钟 / 一言轮播 / 随机文章
 */
import { QUOTES } from '../data/widgets';

let clockTimer = 0;
let quoteTimer = 0;
let initialized = false;

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function tickClock(): void {
  const timeNode = document.querySelector<HTMLElement>('[data-clock-time]');
  const dateNode = document.querySelector<HTMLElement>('[data-clock-date]');
  if (!timeNode) return;

  const now = new Date();
  timeNode.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  if (dateNode) {
    dateNode.textContent = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${WEEKDAYS[now.getDay()]}`;
  }
}

function startClock(): void {
  window.clearInterval(clockTimer);
  tickClock();
  clockTimer = window.setInterval(tickClock, 1000);
}

function startQuotes(): void {
  const node = document.querySelector<HTMLElement>('[data-quote]');
  if (!node || QUOTES.length < 2) return;

  let i = Math.floor(Math.random() * QUOTES.length);
  node.textContent = QUOTES[i] ?? '';

  window.clearInterval(quoteTimer);
  quoteTimer = window.setInterval(() => {
    if (!document.body.contains(node)) {
      window.clearInterval(quoteTimer);
      return;
    }
    node.classList.add('swap');
    window.setTimeout(() => {
      i = (i + 1) % QUOTES.length;
      node.textContent = QUOTES[i] ?? '';
      node.classList.remove('swap');
    }, 300);
  }, 6500);
}

function bindRandom(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-random-post]');
  if (!btn || btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

  btn.addEventListener('click', () => {
    let slugs: string[] = [];
    try {
      slugs = JSON.parse(btn.dataset.slugs || '[]') as string[];
    } catch {
      slugs = [];
    }
    if (slugs.length === 0) {
      btn.textContent = '还没有文章';
      return;
    }
    const pick = slugs[Math.floor(Math.random() * slugs.length)]!;
    window.location.href = `/blog/${pick}/`;
  });
}

function init(): void {
  if (!document.querySelector('.widget-row')) {
    // 离开内页就停掉计时器,避免累积
    if (initialized) {
      window.clearInterval(clockTimer);
      window.clearInterval(quoteTimer);
      initialized = false;
    }
    return;
  }

  bindRandom();

  if (!initialized) {
    initialized = true;
    startClock();
    startQuotes();
    return;
  }

  // 客户端路由切换回内页:重启计时器(节点是新的)
  startClock();
  startQuotes();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
document.addEventListener('astro:page-load', init);
