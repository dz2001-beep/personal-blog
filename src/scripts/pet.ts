/**
 * 网页小宠物:右下角的小精灵
 * - 眼睛跟随鼠标
 * - 点击它 → 冒泡说一句随机台词
 * - 每次页面跳转(ClientRouter)后自动重建,事件只绑一次
 * - 系统「减少动态效果」时保留宠物但关闭待机浮动动画
 */

const LINES = [
  '你好呀!这里是 DZ-Vanguard 的博客~',
  '悄悄告诉你:按 ↑ ↑ ↓ ↓ ← → ← → B A 有惊喜 🎉',
  '写代码累了就看看文章吧 ☕',
  '今天也要开开心心呀 ✨',
  '点我一下,再点我一下,我就再卖个萌 🐣',
  '文章区有 DeepSeek Harness 的深度解析哦~',
  '别老盯着屏幕,记得眨眼 👀',
  '我还在学习中,以后会讲更多话的!',
];

let bound = false;
let bubbleTimer = 0;
const state = { mx: 0, my: 0 };

/** 小精灵 SVG(眼睛瞳孔 id 供跟随使用) */
const PET_SVG = `
<svg viewBox="0 0 96 96" class="pet-svg" aria-hidden="true">
  <defs>
    <linearGradient id="petBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7aa2f7"/>
      <stop offset="100%" stop-color="#bb9af7"/>
    </linearGradient>
  </defs>
  <ellipse cx="48" cy="86" rx="24" ry="5" fill="rgba(31,35,40,0.12)"/>
  <path d="M48 8 C68 8 82 24 82 46 C82 68 70 80 48 80 C26 80 14 68 14 46 C14 24 28 8 48 8 Z" fill="url(#petBody)"/>
  <ellipse cx="30" cy="58" rx="7" ry="4" fill="#ff9ec4" opacity="0.45"/>
  <ellipse cx="66" cy="58" rx="7" ry="4" fill="#ff9ec4" opacity="0.45"/>
  <g class="pet-eye">
    <ellipse cx="36" cy="44" rx="9" ry="10" fill="#fff"/>
    <ellipse cx="60" cy="44" rx="9" ry="10" fill="#fff"/>
    <circle class="pet-pupil" cx="36" cy="45" r="4.5" fill="#2b2f3a"/>
    <circle class="pet-pupil" cx="60" cy="45" r="4.5" fill="#2b2f3a"/>
    <circle cx="34" cy="42" r="1.8" fill="#fff" opacity="0.9"/>
    <circle cx="58" cy="42" r="1.8" fill="#fff" opacity="0.9"/>
  </g>
  <path d="M43 58 Q48 63 53 58" stroke="#2b2f3a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M48 10 Q52 0 60 0 Q53 4 52 12 Z" fill="#9ece6a"/>
</svg>`;

function showBubble(text: string): void {
  const bubble = document.getElementById('pet-bubble');
  if (!bubble) return;
  bubble.textContent = text;
  bubble.classList.add('show');
  window.clearTimeout(bubbleTimer);
  bubbleTimer = window.setTimeout(() => bubble.classList.remove('show'), 3200);
}

function bindEvents(): void {
  if (bound) return;
  bound = true;

  window.addEventListener('mousemove', (e) => {
    state.mx = e.clientX;
    state.my = e.clientY;
    const pet = document.getElementById('blog-pet');
    if (!pet) return;
    const rect = pet.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = state.mx - cx;
    const dy = state.my - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const k = Math.min(2.6, dist / 60);
    const px = (dx / dist) * k;
    const py = (dy / dist) * k;
    document.querySelectorAll<HTMLElement>('.pet-pupil').forEach((pupil) => {
      pupil.style.transform = `translate(${px}px, ${py}px)`;
    });
  });

  document.addEventListener('click', (e) => {
    const pet = (e.target as HTMLElement).closest('#blog-pet');
    if (!pet) return;
    showBubble(LINES[Math.floor(Math.random() * LINES.length)]);
    (pet as HTMLElement).classList.add('pet-bounce');
    window.setTimeout(() => (pet as HTMLElement).classList.remove('pet-bounce'), 420);
  });
}

function ensurePet(): void {
  if (document.getElementById('blog-pet')) {
    bindEvents();
    return;
  }
  bindEvents();

  const pet = document.createElement('div');
  pet.id = 'blog-pet';
  pet.innerHTML = `<div id="pet-bubble" class="pet-bubble"></div>${PET_SVG}`;
  pet.title = '点我一下~';
  document.body.appendChild(pet);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) pet.classList.add('pet-static');
}

ensurePet();
document.addEventListener('astro:page-load', ensurePet);
