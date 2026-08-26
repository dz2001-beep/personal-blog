---
title: '个人博客(本站)'
description: '基于 Astro 构建的静态个人博客,支持技术文章、作品集、个人 Profile、标签筛选、RSS 订阅与暗色主题。'
pubDate: 2025-03-01
tech: ['Astro', 'TypeScript', 'Markdown']
demoUrl: 'https://example.com'
repoUrl: 'https://github.com/dz2001-beep/personal-blog'
featured: true
---

## 项目简介

这就是你正在看的这个网站。它最初是我的一个练手项目,后来慢慢变成了我的「数字家园」—— 在这里写技术文章、展示开源作品、记录个人成长。

## 功能特性

- 📝 **Markdown 写作**:文章和作品都用 Markdown 编写,提交即发布
- 🏷️ **标签体系**:文章支持多标签,列表页可按标签筛选
- 🚀 **作品集**:为每个作品展示技术栈、在线演示和源码链接
- 👤 **个人 Profile**:关于我页面集中展示简介、技能、经历和教育背景
- 📡 **RSS 订阅**:读者可以通过 RSS 订阅最新文章
- 🔍 **SEO 友好**:自动生成 Sitemap、Open Graph 标签
- 🌙 **暗色主题**:程序员友好的暗色界面

## 技术要点

- 使用 Astro 内容集合(Content Collections)管理文章和作品
- Zod schema 对 frontmatter 做类型校验,写错配置构建时直接报错
- 内置 Shiki 语法高亮,支持 100+ 语言
- 零 JS 默认输出,极致性能

## 快速开始

```bash
git clone https://github.com/dz2001-beep/personal-blog
cd personal-blog
npm install
npm run dev
```

打开 `http://localhost:4321` 即可看到效果。
