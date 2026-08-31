/**
 * 背景动态点缀:樱花飘落 + 星光闪烁 + 漂浮光斑 + 鼠标火花拖尾(Canvas,轻量)
 * - 每次页面跳转(ClientRouter)后自动重建,保证任何页面都有动态背景
 * - 事件监听全局只绑定一次,不会重复累积
 * - 尊重系统「减少动态效果」设置:开启时静态渲染一帧
 * - 页面隐藏时暂停,节省性能
 */

const PETAL_COLORS = ['#ffb6c1', '#ffc2d1', '#ff9eb5', '#ffd1dc'];
const PETAL_COUNT = 26;
const STAR_COUNT = 46;
const ORB_COUNT = 3;
const MAX_SPARKLES = 14;

interface Petal {
  x: number; y: number; size: number; speedY: number;
  swayAmp: number; swaySpeed: number; phase: number;
  rot: number; rotSpeed: number; color: string;
}

interface Star {
  x: number; y: number; size: number; twinkleSpeed: number; phase: number; drift: number;
}

interface Orb {
  x: number; y: number; r: number; dx: number; dy: number; hue: string;
}

interface Sparkle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number;
}

/* 鼠标火花(模块级共享,事件只绑一次) */
const sparkles: Sparkle[] = [];
let mouseBound = false;
let lastMouseX = -100;
let lastMouseY = -100;
/** 彩虹色相游标:连续生成的粒子按序取色,形成彩虹拖尾 */
let hueCursor = 0;

/** 当前活动的画布实例(visibilitychange 全局只绑一次) */
let controller: { running: boolean; raf: number; canvas: HTMLCanvasElement; frame: (t: number) => void } | null = null;

document.addEventListener('visibilitychange', () => {
  const c = controller;
  if (!c) return;
  if (document.hidden) {
    c.running = false;
    cancelAnimationFrame(c.raf);
  } else if (!c.running && c.canvas.isConnected) {
    c.running = true;
    c.raf = requestAnimationFrame(c.frame);
  }
});

function onMouseMove(e: MouseEvent): void {
  const dx = e.clientX - lastMouseX;
  const dy = e.clientY - lastMouseY;
  if (dx * dx + dy * dy < 900) return; // 距离太近不生成,避免刷屏
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  if (sparkles.length >= MAX_SPARKLES) sparkles.shift();
  sparkles.push({
    x: e.clientX + (Math.random() * 6 - 3),
    y: e.clientY + (Math.random() * 6 - 3),
    vx: Math.random() * 0.6 - 0.3,
    vy: -0.4 - Math.random() * 0.5,
    life: 0,
    maxLife: 40 + Math.random() * 30,
    size: 1.5 + Math.random() * 2,
    hue: (hueCursor = (hueCursor + 16) % 360), // 彩虹色相按序推进
  });
}

function bindMouse(): void {
  if (mouseBound) return;
  mouseBound = true;
  window.addEventListener('mousemove', onMouseMove);
}

function buildScene(
  w: number, h: number, rand: (a: number, b: number) => number
): { petals: Petal[]; stars: Star[]; orbs: Orb[] } {
  const petals: Petal[] = Array.from({ length: PETAL_COUNT }, () => ({
    x: rand(0, w),
    y: rand(-h, h),
    size: rand(9, 18),
    speedY: rand(0.35, 0.85),
    swayAmp: rand(14, 36),
    swaySpeed: rand(0.4, 0.9),
    phase: rand(0, Math.PI * 2),
    rot: rand(0, Math.PI * 2),
    rotSpeed: rand(-0.02, 0.02),
    color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
  }));

  const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    size: rand(1, 2.5),
    twinkleSpeed: rand(0.5, 1.6),
    phase: rand(0, Math.PI * 2),
    drift: rand(0.05, 0.22),
  }));

  const orbs: Orb[] = Array.from({ length: ORB_COUNT }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    r: rand(120, 240),
    dx: rand(-0.12, 0.12),
    dy: rand(-0.1, 0.1),
    hue: ['rgba(122,162,247,', 'rgba(187,154,247,', 'rgba(255,182,193,'][Math.floor(Math.random() * 3)],
  }));

  return { petals, stars, orbs };
}

function ensureBackground(): void {
  if (document.getElementById('bg-canvas')) {
    bindMouse();
    return;
  }
  bindMouse();

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.id = 'bg-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '-2',
    pointerEvents: 'none',
  } as Partial<CSSStyleDeclaration>);
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let w = 0;
  let h = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize(): void {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  let { petals, stars, orbs } = buildScene(w, h, rand);

  window.addEventListener('resize', () => {
    resize();
    ({ petals, stars, orbs } = buildScene(w, h, rand));
  });

  function drawPetal(p: Petal, t: number): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -p.size / 2);
    ctx.quadraticCurveTo(p.size / 2, 0, 0, p.size / 2);
    ctx.quadraticCurveTo(-p.size / 2, 0, 0, -p.size / 2);
    ctx.fill();
    ctx.restore();

    p.y += p.speedY;
    p.x += Math.sin(t * p.swaySpeed + p.phase) * 0.6;
    p.rot += p.rotSpeed;
    if (p.y > h + 24) {
      p.y = -24;
      p.x = rand(0, w);
    }
    if (p.x < -30) p.x = w + 20;
    if (p.x > w + 30) p.x = -20;
  }

  function drawStar(s: Star, t: number): void {
    const a = 0.25 + 0.55 * Math.abs(Math.sin(t * s.twinkleSpeed + s.phase));
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = `rgba(255, 214, 110, ${a})`;
    ctx.beginPath();
    ctx.moveTo(0, -s.size);
    ctx.lineTo(s.size, 0);
    ctx.lineTo(0, s.size);
    ctx.lineTo(-s.size, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    s.y += s.drift;
    if (s.y > h + 10) {
      s.y = -10;
      s.x = rand(0, w);
    }
  }

  function drawOrb(o: Orb): void {
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
    g.addColorStop(0, `${o.hue}0.07)`);
    g.addColorStop(1, `${o.hue}0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
    ctx.fill();

    o.x += o.dx;
    o.y += o.dy;
    if (o.x < -o.r) o.x = w + o.r;
    if (o.x > w + o.r) o.x = -o.r;
    if (o.y < -o.r) o.y = h + o.r;
    if (o.y > h + o.r) o.y = -o.r;
  }

  function drawSparkles(): void {
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const sp = sparkles[i];
      sp.life += 1;
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy -= 0.006;
      const ratio = 1 - sp.life / sp.maxLife;
      if (ratio <= 0) {
        sparkles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(Math.PI / 4);
      // 彩虹拖尾:按粒子的 hue 取色,并随生命周期渐淡
      ctx.fillStyle = `hsla(${sp.hue}, 95%, 66%, ${0.75 * ratio})`;
      ctx.shadowColor = `hsla(${sp.hue}, 95%, 66%, ${0.6 * ratio})`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, -sp.size * ratio);
      ctx.lineTo(sp.size * ratio, 0);
      ctx.lineTo(0, sp.size * ratio);
      ctx.lineTo(-sp.size * ratio, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function render(t: number): void {
    ctx.clearRect(0, 0, w, h);
    for (const o of orbs) drawOrb(o);
    for (const s of stars) drawStar(s, t / 1000);
    for (const p of petals) drawPetal(p, t / 1000);
    drawSparkles();
    ctx.globalAlpha = 1;
  }

  // 系统减少动画:静态一帧
  if (reduced) {
    render(0);
    return;
  }

  let running = true;

  function frame(t: number): void {
    if (!running || !canvas.isConnected) return;
    render(t);
    controller!.raf = requestAnimationFrame(frame);
  }
  controller = { running, raf: requestAnimationFrame(frame), canvas, frame };
}

// 初始加载 + 每次 ClientRouter 页面跳转后重建(保证任何页面都有动态背景)
ensureBackground();
document.addEventListener('astro:page-load', ensureBackground);
