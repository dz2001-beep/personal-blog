/**
 * 小人物(页面里的小幽灵)交互
 * - 点它 / 回车 / 空格 → 说一句随机台词
 * - 每次进入页面 6 秒后主动打个招呼(同一会话只打一次,避免打扰)
 */

/** 台词:想改成自己的风格就改这个数组 */
const LINES: string[] = [
  '今天也要好好写代码呀~',
  '写文章前,H2 标题先列出来会快很多。',
  'Ctrl+S 已经刻进肌肉记忆了。',
  '记得给文章打标签,不然以后找不到。',
  '累了就抬头看看窗外,真的有用。',
  '这台词你可以随便改,我在 src/scripts/mascot.ts。',
  '音乐挂件里那首歌挺好听的,试试点一下?',
  '后台写完记得点发布,别只存草稿。',
  '深呼吸,然后从最小的那步开始。',
  '把复杂的事情做简单,是一种能力。',
  '今天的 bug,是明天的经验。',
  '要不要去看看相册,治愈一下眼睛?',
];

const GREETING_KEY = 'blog:mascot-greeted';
let bubbleTimer = 0;

function pickLine(): string {
  return LINES[Math.floor(Math.random() * LINES.length)] ?? LINES[0]!;
}

function speak(root: HTMLElement, text = pickLine()): void {
  const bubble = root.querySelector<HTMLElement>('[data-mascot-bubble]');
  if (!bubble) return;

  bubble.textContent = text;
  bubble.classList.add('show');
  bubble.setAttribute('aria-hidden', 'false');

  window.clearTimeout(bubbleTimer);
  bubbleTimer = window.setTimeout(() => {
    bubble.classList.remove('show');
    bubble.setAttribute('aria-hidden', 'true');
  }, 4200);
}

function bind(root: HTMLElement): void {
  if (root.dataset.bound === '1') return;
  root.dataset.bound = '1';

  root.addEventListener('click', () => speak(root));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      speak(root);
    }
  });
}

function ensure(): void {
  const mascots = document.querySelectorAll<HTMLElement>('[data-mascot]');
  mascots.forEach((root) => {
    bind(root);

    // 每个浏览器会话只在首页进站后打一次招呼
    let greeted = false;
    try {
      greeted = sessionStorage.getItem(GREETING_KEY) === '1';
    } catch {
      /* 隐私模式下忽略 */
    }
    if (!greeted && !root.dataset.greeted) {
      root.dataset.greeted = '1';
      try {
        sessionStorage.setItem(GREETING_KEY, '1');
      } catch {
        /* 忽略 */
      }
      window.setTimeout(() => speak(root, '你好呀,戳我一下试试~'), 6000);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensure, { once: true });
} else {
  ensure();
}
document.addEventListener('astro:page-load', ensure);
