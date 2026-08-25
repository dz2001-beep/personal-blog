---
title: '用 Astro 从零搭建个人博客:完整实践记录'
description: '从技术选型到部署上线的全过程记录,包含内容集合、主题设计、SEO 等细节。'
pubDate: 2025-02-20
updatedDate: 2025-03-01
tags: ['Astro', '前端', '教程']
---

## 为什么选择 Astro

在搭建个人博客之前,我对比了几种主流方案。最终选择 [Astro](https://astro.build) 的原因很简单:

1. **内容优先**:原生支持 Markdown 内容集合(content collections),写文章体验极佳
2. **性能出色**:默认输出纯静态页面,零 JS 也能完美运行
3. **学习曲线平缓**:语法接近 HTML,上手成本低
4. **生态成熟**:官方提供 RSS、Sitemap、MDX 等第一方集成

## 项目结构

一个典型的 Astro 博客项目结构如下:

```text
├── public/                  # 静态资源
│   ├── avatar.svg           # 头像
│   └── favicon.svg
├── src/
│   ├── content/
│   │   ├── blog/            # 技术文章(每个 .md 文件一篇文章)
│   │   └── works/           # 作品集(每个 .md 文件一个作品)
│   ├── layouts/             # 布局组件
│   ├── components/          # 可复用组件
│   ├── pages/               # 页面路由
│   ├── styles/              # 全局样式
│   └── config.ts            # 站点配置(个人信息都在这里)
└── astro.config.mjs
```

## 内容集合的定义

内容集合用 Zod schema 定义每篇文章的 frontmatter 结构,写错了会在构建时直接报错:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});
```

## 几个小细节

### 1. 语法高亮

Astro 内置了 [Shiki](https://shiki.style) 语法高亮,在配置里选一个喜欢的主题即可:

```js
markdown: {
  shikiConfig: {
    theme: 'github-dark-dimmed',
    wrap: true,
  },
}
```

### 2. 自动目录

`render()` 会返回文章的所有标题,可以直接渲染成目录:

```astro
---
const { Content, headings } = await render(post);
---

<nav>
  {headings.map((h) => <a href={`#${h.slug}`}>{h.text}</a>)}
</nav>
```

### 3. RSS 订阅

配合官方 `@astrojs/rss`,几十行代码就能给博客加上 RSS 订阅。

## 部署建议

静态站点可以部署到任何静态托管平台,例如:

- **Vercel / Netlify**:连接 GitHub 仓库即可自动部署
- **GitHub Pages**:免费,配合 Actions 自动化
- **自己的服务器**:Nginx + `npm run build` 产物

> 提示:部署前记得把 `src/config.ts` 里的 `url` 改成你的真实域名,否则 RSS 和 Sitemap 里的链接会不对。

## 总结

从选型到写完这篇文章,整个过程大概用了一下午。Astro 让「写博客」这件事回归到了内容本身 —— 打开编辑器,写 Markdown,提交,完事。

希望这份实践记录对你有帮助。如果有什么问题,欢迎在评论区(如果有的话)或者社交平台找我交流。
