/**
 * 自定义光标:跟随圆点 + 拖尾光环,悬停交互元素时光环放大
 * - 触屏设备 / 系统「减少动态效果」时自动禁用(保留原生光标)
 * - 脚本未运行时保留原生光标(不会出现没光标的情况)
 */

export function initCursor(): void {
  if (window.__cursorInit) return;
  window.__cursorInit = true;

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

  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let rx = tx;
  let ry = ty;
  let visible = false;

  const INTERACTIVE = 'a, button, input, textarea, select, [role="button"], .tag, label';

  window.addEventListener('mousemove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!visible) {
      visible = true;
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    }
    dot.style.transform = `translate(-50%, -50%) translate3d(${tx}px, ${ty}px, 0)`;
    const target = e.target as HTMLElement;
    ring.classList.toggle('cursor-hover', !!target.closest?.(INTERACTIVE));
  });

  document.addEventListener('mousedown', () => ring.classList.add('cursor-press'));
  document.addEventListener('mouseup', () => ring.classList.remove('cursor-press'));

  document.documentElement.addEventListener('mouseleave', () => {
    visible = false;
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });
  document.documentElement.addEventListener('mouseenter', () => {
    visible = true;
    dot.style.opacity = '1';
    ring.style.opacity = '1';
  });

  let raf = 0;
  function loop(): void {
    rx += (tx - rx) * 0.16;
    ry += (ty - ry) * 0.16;
    ring.style.transform = `translate(-50%, -50%) translate3d(${rx}px, ${ry}px, 0)`;
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
}

declare global {
  interface Window {
    __cursorInit?: boolean;
  }
}

// 模块加载即启动(副作用调用,防止被摇树优化移除)
initCursor();
