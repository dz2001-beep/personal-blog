/**
 * 隐藏彩蛋:在键盘依次按下 ↑ ↑ ↓ ↓ ← → ← → B A 触发
 * - 屏幕落下彩色纸屑
 * - 弹出提示
 */

const SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const COLORS = ['#2563eb', '#7c3aed', '#ff5f8f', '#ffb347', '#9ece6a', '#22d3ee', '#ff9ec4'];

let bound = false;
let progress = 0;

function fireConfetti(): void {
  const count = 90;
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:9998;overflow:hidden;';

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i');
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 1.8 + Math.random() * 1.6;
    const size = 5 + Math.random() * 7;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    piece.style.cssText = `
      position:absolute;top:-12px;left:${left}vw;
      width:${size}px;height:${size * 0.55}px;
      background:${color};border-radius:2px;
      opacity:0.95;
      animation:petConfettiFall ${duration}s linear ${delay}s forwards;
    `;
    wrap.appendChild(piece);
  }

  const msg = document.createElement('div');
  msg.textContent = '🎉 彩蛋解锁!你发现了 Konami 秘技';
  msg.style.cssText = `
    position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);
    background:linear-gradient(120deg,rgba(37,99,235,.95),rgba(124,58,237,.95));
    color:#fff;padding:14px 26px;border-radius:999px;
    font-size:0.95rem;font-weight:600;box-shadow:0 10px 30px rgba(31,35,40,.25);
    z-index:9999;animation:fadeUp .4s ease both;white-space:nowrap;
  `;
  document.body.appendChild(msg);
  document.body.appendChild(wrap);

  window.setTimeout(() => {
    wrap.remove();
    msg.remove();
  }, 4200);
}

function onKeydown(e: KeyboardEvent): void {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === SEQUENCE[progress]) {
    progress += 1;
    if (progress === SEQUENCE.length) {
      progress = 0;
      fireConfetti();
    }
  } else {
    progress = key === SEQUENCE[0] ? 1 : 0;
  }
}

function bindEvents(): void {
  if (bound) return;
  bound = true;
  window.addEventListener('keydown', onKeydown);
}

bindEvents();
