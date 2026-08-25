import type { APIRoute } from 'astro';
import { getPublishedPosts, getAllWorks, getSiteConfig } from '../lib/db';

/** 动态 Sitemap(替代构建期 @astrojs/sitemap) */
export const GET: APIRoute = async () => {
  const site = getSiteConfig();
  const base = site.url.replace(/\/$/, '');

  const staticPaths = ['/', '/about', '/blog', '/works'];
  const posts = getPublishedPosts();
  const works = getAllWorks();
  const tags = [...new Set(posts.flatMap((p) => p.tags))];

  const urls = [
    ...staticPaths.map((p) => `${base}${p}`),
    ...posts.map((p) => `${base}/blog/${p.slug}/`),
    ...tags.map((t) => `${base}/blog/tag/${encodeURIComponent(t)}/`),
    ...works.map((w) => `${base}/works/${w.slug}/`),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
