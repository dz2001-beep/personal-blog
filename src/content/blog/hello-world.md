---
title: '欢迎来到我的博客'
description: '第一篇博客文章,介绍一下这个博客的用途,以及我会在这里写些什么。'
pubDate: 2025-01-15
tags: ['随笔', '博客']
---

## 为什么写博客

作为一个程序员,我越来越觉得 **写作是最好的学习方式**。当你试图把一个问题讲清楚的时候,你才会发现自己到底有没有真正理解它。

这个博客会用来记录:

- 技术踩坑与解决方案
- 框架与工具的学习笔记
- 开源项目的开发过程
- 偶尔的一些随笔和思考

## 技术栈

这个博客本身是开源的,基于 [Astro](https://astro.build) 构建:

```bash
# 本地开发
npm run dev

# 构建静态站点
npm run build
```

文章全部使用 Markdown 编写,放在 `src/content/blog/` 目录下。每篇文章的开头是一段 frontmatter,用来声明标题、摘要、日期和标签:

```yaml
---
title: '文章标题'
description: '文章摘要'
pubDate: 2025-01-15
tags: ['标签一', '标签二']
---
```

## 关于排版

这里支持常见的 Markdown 语法,比如 **加粗**、*斜体*、`行内代码`,以及:

> 引用块:努力让写作成为习惯。

还有代码块,带语法高亮:

```ts
interface BlogPost {
  title: string;
  tags: string[];
  pubDate: Date;
}

function greet(name: string): string {
  return `你好,${name},欢迎来到我的博客!`;
}
```

## 写在最后

希望这里的每一篇文章都能对读到它的你有所帮助。如果有任何问题,欢迎通过博客页脚的联系方式找到我。

让我们开始吧 🚀
