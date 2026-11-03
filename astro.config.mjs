// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import mdx from '@astrojs/mdx';

import { SITE } from './src/config';

// https://astro.build/config
export default defineConfig({
  // 部署到线上后,请把这里的 URL 改成你的真实域名(后台设置里也能改)
  site: SITE.url,
  // 全栈模式:页面由服务器渲染,数据来自 SQLite
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      // 代码高亮主题(白色主题用浅色系)
      theme: 'github-dark-dimmed',
      // 让代码块在窄屏上可横向滚动而不是换行
      wrap: true,
    },
  },
  vite: {
    server: {
      // 开发模式下允许局域网访问(方便用手机预览)
      host: true,
    },
  },
});
