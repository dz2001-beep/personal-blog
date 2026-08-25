# 个人博客

基于 [Astro](https://astro.build) 构建的静态个人博客,包含 **个人 Profile、技术文章、作品集** 三大板块,全部内容用 Markdown 编写,提交即发布。

## ✨ 功能

- 👤 **关于我**:头像(支持网页端上传/恢复默认)、个人简介、技术栈、工作经历、教育背景
- 📝 **技术文章**:Markdown 写作、实时搜索、标签页、目录导航、阅读时长、代码高亮、上一篇/下一篇
- 🚀 **作品集**:作品卡片、技术栈标签、在线演示/源码链接
- 🎬 **动画特效**:白色主题 + 页面切换过渡、hero 打字机、滚动渐显、阅读进度条、回到顶部
- 📡 **RSS 订阅** + 🤖 **Sitemap** + ⚡ 纯静态零依赖 JS 高性能

## 🚀 快速开始

```bash
npm install
npm run dev        # 本地开发:http://localhost:4321
npm run build      # 构建静态站点(输出到 dist/)
npm run preview    # 本地预览构建产物
```

## 📁 项目结构

```
├── public/                  # 静态资源(头像、favicon)
│   ├── avatar.svg           # ← 替换成你的头像
│   └── favicon.svg
├── src/
│   ├── config.ts            # ← 站点信息、社交链接(先改这里!)
│   ├── content.config.ts    # 内容集合 schema
│   ├── content/
│   │   ├── blog/            # ← 技术文章:每个 .md 文件一篇文章
│   │   └── works/           # ← 作品:每个 .md 文件一个作品
│   ├── data/
│   │   └── profile.ts       # ← 关于我页面的个人资料
│   ├── layouts/             # 布局
│   ├── components/          # 组件(Header/Footer/卡片等)
│   ├── pages/               # 页面(首页/关于/文章/作品)
│   ├── styles/              # 全局样式(改 CSS 变量即可换主题)
│   └── utils/
└── astro.config.mjs         # Astro 配置
```

## ✍️ 写一篇文章

在 `src/content/blog/` 下新建一个 `.md` 文件即可,头部格式:

```yaml
---
title: '文章标题'
description: '文章摘要(列表页和 SEO 使用)'
pubDate: 2025-01-01
tags: ['标签一', '标签二']
draft: false          # true 时不发布
---
```

正文直接写 Markdown,支持代码高亮、引用、表格、图片等。

## 🛠️ 添加一个作品

在 `src/content/works/` 下新建 `.md` 文件:

```yaml
---
title: '作品名称'
description: '作品简介'
pubDate: 2025-01-01
tech: ['React', 'TypeScript']   # 技术栈标签
demoUrl: 'https://demo.example.com'   # 在线演示(可选)
repoUrl: 'https://github.com/you/repo'  # 源码地址(可选)
featured: true    # true 时在首页精选展示
---
```

## 🎨 个性化

| 想改什么 | 改哪里 |
| --- | --- |
| 站点标题、简介、域名 | `src/config.ts` |
| 头像、favicon | 网页端「关于我」页可上传,或替换 `public/avatar.svg`、`public/favicon.svg` |
| 关于我页面的资料 | `src/data/profile.ts` |
| 主题颜色(白/暗)、动画 | `src/styles/global.css` 里的 CSS 变量 |
| 社交链接 | `src/config.ts` 的 `SOCIAL` |

> 💡 头像上传是纯前端方案:图片会压缩后存到浏览器 localStorage,刷新/换页都在,但换浏览器或设备不会同步;想永久生效就把图片放到 `public/` 替换 `avatar.svg`。

## ☁️ 部署

静态站点可部署到任意平台:Vercel、Netlify、GitHub Pages、Nginx 等。

> ⚠️ 上线前记得把 `src/config.ts` 里的 `url` 改成真实域名。

## 📄 License

MIT
