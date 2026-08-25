/**
 * 光标动画:保留正常箭头光标(CSS cursor 换成彩色渐变箭头),
 * 附加一个柔和脉动的发光光晕跟随鼠标,悬停交互元素时放大变色。
 * - 每次页面跳转(ClientRouter)后自动重建
 * - 事件监听全局只绑定一次,不会重复累积
 * - 触屏设备 / 系统「减少动态效果」时自动禁用(保留原生光标)
 */

const INTERACTIVE = 'a, button, input, textarea, select, [role="button"], .tag, label';

let bound = false;
let raf = 0;
const state = { tx: -100, ty: -100, x: -100, y: -100 };

function onMove(e: MouseEvent): void {
  state.tx = e.clientX;
  state.ty = e.clientY;
  const glow = document.getElementById('cursor-glow');
  if (glow) {
    glow.classList.toggle('cursor-hover', !!(e.target as HTMLElement).closest?.(INTERACTIVE));
  }
}

function loop(): void {
  const glow = document.getElementById('cursor-glow');
  if (glow) {
    state.x += (state.tx - state.x) * 0.18;
    state.y += (state.ty - state.y) * 0.18;
    glow.style.transform = `translate3d(${state.x}px, ${state.y}px, 0)`;
  }
  raf = requestAnimationFrame(loop);
}

function bindEvents(): void {
  if (bound) return;
  bound = true;
  window.addEventListener('mousemove', onMove);
  document.addEventListener('mousedown', () =>
    document.getElementById('cursor-glow')?.classList.add('cursor-press')
  );
  document.addEventListener('mouseup', () =>
    document.getElementById('cursor-glow')?.classList.remove('cursor-press')
  );
  raf = requestAnimationFrame(loop);
}

function ensureCursor(): void {
  if (document.getElementById('cursor-glow')) {
    bindEvents();
    return;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (reduced || coarse) return;

  const glow = document.createElement('div');
  glow.id = 'cursor-glow';
  document.body.appendChild(glow);
  document.documentElement.classList.add('has-custom-cursor');

  bindEvents();
}

// 初始加载 + 每次 ClientRouter 页面跳转后重建
ensureCursor();
document.addEventListener('astro:page-load', ensureCursor);
