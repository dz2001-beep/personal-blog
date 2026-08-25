/**
 * 自定义光标:跟随圆点 + 拖尾光环,悬停交互元素时光环放大
 * - 每次页面跳转(ClientRouter)后自动重建
 * - 事件监听全局只绑定一次,不会重复累积
 * - 触屏设备 / 系统「减少动态效果」时自动禁用(保留原生光标)
 */

const INTERACTIVE = 'a, button, input, textarea, select, [role="button"], .tag, label';

let bound = false;
let raf = 0;
const state = { tx: window.innerWidth / 2, ty: window.innerHeight / 2, rx: 0, ry: 0, visible: false };
state.rx = state.tx;
state.ry = state.ty;

function onMove(e: MouseEvent): void {
  state.tx = e.clientX;
  state.ty = e.clientY;
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;
  if (!state.visible) {
    state.visible = true;
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  }
  dot.style.transform = `translate(-50%, -50%) translate3d(${state.tx}px, ${state.ty}px, 0)`;
  ring.classList.toggle('cursor-hover', !!(e.target as HTMLElement).closest?.(INTERACTIVE));
}

function onLeave(): void {
  state.visible = false;
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (dot) dot.style.opacity = '0';
  if (ring) ring.style.opacity = '0';
}

function onEnter(): void {
  state.visible = true;
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (dot) dot.style.opacity = '1';
  if (ring) ring.style.opacity = '1';
}

function loop(): void {
  const ring = document.getElementById('cursor-ring');
  if (ring) {
    state.rx += (state.tx - state.rx) * 0.16;
    state.ry += (state.ty - state.ry) * 0.16;
    ring.style.transform = `translate(-50%, -50%) translate3d(${state.rx}px, ${state.ry}px, 0)`;
  }
  raf = requestAnimationFrame(loop);
}

function bindEvents(): void {
  if (bound) return;
  bound = true;
  window.addEventListener('mousemove', onMove);
  document.addEventListener('mousedown', () =>
    document.getElementById('cursor-ring')?.classList.add('cursor-press')
  );
  document.addEventListener('mouseup', () =>
    document.getElementById('cursor-ring')?.classList.remove('cursor-press')
  );
  document.documentElement.addEventListener('mouseleave', onLeave);
  document.documentElement.addEventListener('mouseenter', onEnter);
  raf = requestAnimationFrame(loop);
}

function ensureCursor(): void {
  if (document.getElementById('cursor-dot') && document.getElementById('cursor-ring')) {
    bindEvents();
    return;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (reduced || coarse) return;

  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.id = 'cursor-dot';
  ring.id = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.documentElement.classList.add('has-custom-cursor');

  bindEvents();
}

// 初始加载 + 每次 ClientRouter 页面跳转后重建
ensureCursor();
document.addEventListener('astro:page-load', ensureCursor);
