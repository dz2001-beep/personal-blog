/**
 * 古风背景动画:天空渐变 + 远山 + 古代小屋 + 花树随风摇曳 + 落花 + 流云飞鸟
 * - Canvas 轻量实现,尊重系统「减少动态效果」(静态渲染一帧)
 * - 页面隐藏时暂停动画
 */

const PETAL_COLORS = ['#ffb7c5', '#ffc9d4', '#ff9eb5', '#f7c8d6', '#ffe0e8'];

interface Petal {
  x: number; y: number; size: number; speedY: number; speedX: number;
  sway: number; phase: number; rot: number; rotV: number; color: string;
}

interface Branch {
  x1: number; y1: number; angle: number; len: number; width: number;
  level: number; phase: number;
}

interface Blossom {
  x: number; y: number; r: number; phase: number; amp: number;
}

declare global {
  interface Window {
    __bgInit?: boolean;
  }
}

export function initBackground(): void {
  if (window.__bgInit) return;
  window.__bgInit = true;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  /* ---------- 场景数据 ---------- */
  let branches: Branch[] = [];
  let blossoms: Blossom[] = [];
  let petals: Petal[] = [];

  function buildScene(): void {
    const treeX = w * 0.85;
    const treeBaseY = h * 0.86;
    const treeTopY = h * 0.4;

    // 花树:递归生成枝干
    branches = [];
    const seedBranch = (
      x1: number, y1: number, angle: number, len: number, width: number, level: number, phase: number
    ): void => {
      branches.push({ x1, y1, angle, len, width, level, phase });
      if (level >= 3) return;
      const n = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        const a = angle + rand(-0.55, 0.55);
        const l = len * rand(0.62, 0.78);
        seedBranch(
          x1 + Math.cos(angle) * len,
          y1 + Math.sin(angle) * len,
          a, l, width * 0.66, level + 1, phase + rand(0.4, 1.6)
        );
      }
    };
    seedBranch(treeX, treeBaseY, -Math.PI / 2, h * 0.1, 15, 0, 0);

    // 花簇:枝头 + 树冠区域
    blossoms = [];
    for (const b of branches) {
      if (b.level >= 2) {
        const ex = b.x1 + Math.cos(b.angle) * b.len;
        const ey = b.y1 + Math.sin(b.angle) * b.len;
        const n = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) {
          blossoms.push({
            x: ex + rand(-9, 9),
            y: ey + rand(-9, 9),
            r: rand(3, 7),
            phase: rand(0, Math.PI * 2),
            amp: rand(1, 3),
          });
        }
      }
    }
    const canopyR = w * 0.13;
    for (let i = 0; i < 28; i++) {
      const a = rand(0, Math.PI * 2);
      const rr = Math.sqrt(Math.random()) * canopyR;
      blossoms.push({
        x: treeX + Math.cos(a) * rr,
        y: treeTopY + Math.sin(a) * rr * 0.72,
        r: rand(4, 9),
        phase: rand(0, Math.PI * 2),
        amp: rand(1.5, 4),
      });
    }

    // 花瓣:部分从花树飘落,部分全屏飘洒
    petals = [];
    for (let i = 0; i < 40; i++) {
      const fromTree = i < 22;
      petals.push({
        x: fromTree ? treeX + rand(-80, 90) : rand(0, w),
        y: fromTree ? treeTopY + rand(-60, 240) : rand(-h * 0.3, h),
        size: rand(8, 16),
        speedY: rand(0.5, 1.15),
        speedX: rand(0.2, 0.65),
        sway: rand(0.4, 0.9),
        phase: rand(0, Math.PI * 2),
        rot: rand(0, Math.PI * 2),
        rotV: rand(-0.03, 0.03),
        color: PETAL_COLORS[i % PETAL_COLORS.length],
      });
    }
  }

  buildScene();
  window.addEventListener('resize', () => {
    resize();
    buildScene();
  });

  /* ---------- 绘制 ---------- */

  function drawSky(): void {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fdf8f0');
    g.addColorStop(0.55, '#fdf0e4');
    g.addColorStop(1, '#f5e6ec');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawClouds(t: number): void {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 2; i++) {
      const cx = (((t * 0.006 + i * 0.45) % 1.3) * w) - w * 0.15;
      const cy = h * (0.09 + i * 0.07);
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.09, h * 0.026, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + w * 0.035, cy - h * 0.011, w * 0.055, h * 0.019, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMountains(): void {
    const layers = [
      { base: 0.8, alpha: 0.4, color: '#c3d0e4', peaks: [0, 0.16, 0.32, 0.5, 0.66, 0.84, 1] },
      { base: 0.88, alpha: 0.5, color: '#aebfd9', peaks: [0.06, 0.24, 0.42, 0.6, 0.78, 0.95] },
    ];
    for (const layer of layers) {
      const baseY = h * layer.base;
      ctx.fillStyle = layer.color;
      ctx.globalAlpha = layer.alpha;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let i = 0; i < layer.peaks.length; i++) {
        const x = layer.peaks[i] * w;
        const peakH = h * (0.055 + (i % 3) * 0.02);
        const py = baseY - peakH;
        if (i === 0) ctx.lineTo(x, py);
        else ctx.quadraticCurveTo((layer.peaks[i - 1] + x) / 2, baseY - peakH * 1.7, x, py);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** 古代小屋(飞檐翘角) */
  function drawHouse(): void {
    const gx = w * 0.08;
    const gy = h * 0.86;
    const bw = Math.min(w * 0.17, 200);
    const bh = bw * 0.62;

    // 地面淡雾
    const g = ctx.createLinearGradient(0, gy, 0, h);
    g.addColorStop(0, 'rgba(196,188,178,0.28)');
    g.addColorStop(1, 'rgba(196,188,178,0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(0, gy, w, h - gy);

    // 墙体
    ctx.fillStyle = 'rgba(122,118,138,0.32)';
    ctx.fillRect(gx, gy - bh, bw, bh);
    // 门
    ctx.fillStyle = 'rgba(90,86,106,0.45)';
    ctx.fillRect(gx + bw * 0.4, gy - bh * 0.52, bw * 0.2, bh * 0.52);
    // 窗(暖光)
    ctx.fillStyle = 'rgba(255,238,196,0.55)';
    ctx.fillRect(gx + bw * 0.12, gy - bh * 0.62, bw * 0.17, bh * 0.2);
    // 飞檐屋顶(两端上翘)
    ctx.fillStyle = 'rgba(100,96,118,0.55)';
    ctx.beginPath();
    ctx.moveTo(gx - bw * 0.16, gy - bh * 0.94);
    ctx.quadraticCurveTo(gx + bw * 0.26, gy - bh * 1.34, gx + bw * 0.5, gy - bh * 1.24);
    ctx.quadraticCurveTo(gx + bw * 0.74, gy - bh * 1.34, gx + bw * 1.16, gy - bh * 0.94);
    ctx.quadraticCurveTo(gx + bw * 0.5, gy - bh * 1.0, gx - bw * 0.16, gy - bh * 0.94);
    ctx.closePath();
    ctx.fill();
    // 屋脊尖
    ctx.fillStyle = 'rgba(84,80,100,0.6)';
    ctx.beginPath();
    ctx.arc(gx + bw * 0.5, gy - bh * 1.23, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 花树(随风摇曳) */
  function drawTree(t: number): void {
    for (const b of branches) {
      const sway = Math.sin(t * 0.0011 + b.phase) * 0.05 * (b.level + 0.4);
      const a = b.angle + sway;
      const ex = b.x1 + Math.cos(a) * b.len;
      const ey = b.y1 + Math.sin(a) * b.len;
      ctx.strokeStyle = b.level === 0 ? 'rgba(110,84,64,0.8)' : 'rgba(124,96,74,0.72)';
      ctx.lineWidth = Math.max(b.width * 0.5, 1.2);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.quadraticCurveTo(
        b.x1 + Math.cos(a) * b.len * 0.5 + Math.sin(t * 0.001 + b.phase) * 2,
        b.y1 + Math.sin(a) * b.len * 0.5,
        ex, ey
      );
      ctx.stroke();
    }

    // 花簇
    for (const bl of blossoms) {
      const ox = Math.sin(t * 0.0012 + bl.phase) * bl.amp;
      const oy = Math.cos(t * 0.001 + bl.phase) * bl.amp * 0.5;
      ctx.fillStyle = 'rgba(255,158,181,0.72)';
      ctx.beginPath();
      ctx.arc(bl.x + ox, bl.y + oy, bl.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(bl.x + ox - bl.r * 0.3, bl.y + oy - bl.r * 0.3, bl.r * 0.34, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPetalShape(x: number, y: number, size: number, rot: number, color: string): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -size / 2);
    ctx.quadraticCurveTo(size / 2, 0, 0, size / 2);
    ctx.quadraticCurveTo(-size / 2, 0, 0, -size / 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPetals(t: number): void {
    for (const p of petals) {
      drawPetalShape(p.x, p.y, p.size, p.rot, p.color);
      p.y += p.speedY;
      p.x += p.speedX + Math.sin(t * 0.0012 + p.phase) * p.sway;
      p.rot += p.rotV;
      if (p.y > h + 20) {
        p.y = -20;
        p.x = rand(0, w);
      }
      if (p.x > w + 30) p.x = -20;
      if (p.x < -30) p.x = w + 20;
    }
    ctx.globalAlpha = 1;
  }

  function drawBirds(t: number): void {
    ctx.strokeStyle = 'rgba(90,90,110,0.5)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const cx = (((t * 0.012 + i * 0.5) % 1.2) * w) - w * 0.1;
      const cy = h * (0.15 + i * 0.05) + Math.sin(t * 0.002 + i * 2) * 6;
      const s = 7;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy);
      ctx.quadraticCurveTo(cx - s * 0.4, cy - s * 0.7, cx, cy);
      ctx.quadraticCurveTo(cx + s * 0.4, cy - s * 0.7, cx + s, cy);
      ctx.stroke();
    }
  }

  function render(t: number): void {
    ctx.clearRect(0, 0, w, h);
    drawSky();
    drawClouds(t);
    drawMountains();
    drawHouse();
    drawTree(t);
    drawPetals(t);
    drawBirds(t);
  }

  // 系统减少动画:只渲染一帧静态画面
  if (reduced) {
    render(0);
    return;
  }

  let raf = 0;
  let running = true;
  function frame(t: number): void {
    if (!running) return;
    render(t);
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
