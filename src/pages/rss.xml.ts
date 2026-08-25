import rss from '@astrojs/rss';
import { getPublishedPosts, getSiteConfig } from '../lib/db';

export async function GET(context) {
  const site = getSiteConfig();
  const posts = getPublishedPosts();

  return rss({
    title: `${site.title} · ${site.author}`,
    description: site.description,
    site: site.url,
    items: posts.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: new Date(post.created_at),
      link: `${site.url}/blog/${post.slug}/`,
    })),
    customData: '<language>zh-cn</language>',
  });
}
