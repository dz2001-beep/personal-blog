// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

import { SITE } from './src/config';

// https://astro.build/config
export default defineConfig({
  // 部署到线上后,请把这里的 URL 改成你的真实域名
  site: SITE.url,
  integrations: [sitemap(), mdx()],
  markdown: {
    shikiConfig: {
      // 代码高亮主题,可选 github-dark / one-dark-pro 等
      theme: 'github-dark-dimmed',
      // 让代码块在窄屏上可横向滚动而不是换行
      wrap: true,
    },
  },
});
