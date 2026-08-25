/**
 * 背景点缀动画:樱花飘落 + 星光闪烁 + 漂浮光斑(Canvas,轻量)
 * - 尊重系统「减少动态效果」设置:开启时直接不渲染
 * - 页面隐藏时暂停,节省性能
 */

const PETAL_COLORS = ['#ffb6c1', '#ffc2d1', '#ff9eb5', '#ffd1dc'];
const PETAL_COUNT = 16;
const STAR_COUNT = 42;
const ORB_COUNT = 3;

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

declare global {
  interface Window {
    __bgInit?: boolean;
  }
}

export function initBackground(): void {
  if (window.__bgInit) return;
  window.__bgInit = true;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
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
  window.addEventListener('resize', resize);

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  const petals: Petal[] = Array.from({ length: PETAL_COUNT }, () => ({
    x: rand(0, w),
    y: rand(-h, h),
    size: rand(9, 18),
    speedY: rand(0.35, 0.8),
    swayAmp: rand(14, 34),
    swaySpeed: rand(0.4, 0.9),
    phase: rand(0, Math.PI * 2),
    rot: rand(0, Math.PI * 2),
    rotSpeed: rand(-0.02, 0.02),
    color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
  }));

  const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    size: rand(1, 2.4),
    twinkleSpeed: rand(0.5, 1.6),
    phase: rand(0, Math.PI * 2),
    drift: rand(0.05, 0.2),
  }));

  const orbs: Orb[] = Array.from({ length: ORB_COUNT }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    r: rand(120, 240),
    dx: rand(-0.12, 0.12),
    dy: rand(-0.1, 0.1),
    hue: ['rgba(122,162,247,', 'rgba(187,154,247,', 'rgba(255,182,193,'][Math.floor(Math.random() * 3)],
  }));

  function drawPetal(p: Petal, t: number): void {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    // 花瓣:两段二次曲线
    ctx.moveTo(0, -p.size / 2);
    ctx.quadraticCurveTo(p.size / 2, 0, 0, p.size / 2);
    ctx.quadraticCurveTo(-p.size / 2, 0, 0, -p.size / 2);
    ctx.fill();
    ctx.restore();

    // 更新
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
    // 菱形星光
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

  let raf = 0;
  let running = true;

  function frame(t: number): void {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const o of orbs) drawOrb(o);
    for (const s of stars) drawStar(s, t / 1000);
    for (const p of petals) drawPetal(p, t / 1000);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  });
}

// 模块加载即启动(副作用调用,防止被摇树优化移除)
initBackground();
