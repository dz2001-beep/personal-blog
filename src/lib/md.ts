/**
 * Markdown 渲染:marked 渲染 + shiki 代码高亮(服务端)
 */
import { marked } from 'marked';
import { codeToHtml } from 'shiki';

marked.setOptions({ gfm: true, breaks: false });

// marked 输出的代码块:<pre><code class="language-xxx">...</code></pre>
const CODE_BLOCK_RE = /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g;
// 标题(用于目录)
const HEADING_RE = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/g;

export interface Heading {
  depth: 2 | 3;
  slug: string;
  text: string;
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function slugifyHeading(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

/** 渲染 Markdown 为 HTML,返回正文和目录结构 */
export async function renderMarkdown(md: string): Promise<{ html: string; headings: Heading[] }> {
  let raw = marked.parse(md) as string;

  // 1) 给标题加 id 并收集目录
  const headings: Heading[] = [];
  const used = new Set<string>();
  raw = raw.replace(HEADING_RE, (_m, level, inner) => {
    const text = unescapeHtml(inner.replace(/<[^>]+>/g, '')).trim();
    let slug = slugifyHeading(text);
    let n = 2;
    while (used.has(slug)) slug = `${slugifyHeading(text)}-${n++}`;
    used.add(slug);
    headings.push({ depth: Number(level) as 2 | 3, slug, text });
    return `<h${level} id="${slug}">${inner}</h${level}>`;
  });

  // 2) 代码块高亮
  const jobs: { lang: string; code: string; block: string }[] = [];
  for (const m of raw.matchAll(CODE_BLOCK_RE)) {
    jobs.push({ lang: m[1], code: unescapeHtml(m[2]), block: m[0] });
  }
  let html = raw;
  for (const job of jobs) {
    try {
      const highlighted = await codeToHtml(job.code.trim(), {
        lang: job.lang,
        theme: 'github-dark-dimmed',
      });
      html = html.replace(job.block, highlighted);
    } catch {
      /* 高亮失败则保留原始代码块 */
    }
  }

  return { html, headings };
}
