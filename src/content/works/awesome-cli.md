---
title: 'awesome-cli:一个开箱即用的脚手架工具'
description: '一个用 Node.js 编写的命令行脚手架工具,支持自定义模板、交互式问答和自动安装依赖,让新项目初始化从 10 分钟缩短到 10 秒。'
pubDate: 2024-11-08
tech: ['Node.js', 'TypeScript', 'CLI']
demoUrl: ''
repoUrl: 'https://github.com/yourname/awesome-cli'
featured: true
---

## 项目简介

`awesome-cli` 是一个命令行脚手架工具,用来快速初始化项目。支持:

- 交互式问答选择模板
- 模板变量替换
- 初始化后自动安装依赖
- 支持自定义模板仓库

## 效果演示

```bash
$ npx awesome-cli create my-app

? 选择项目模板:
  ❯ React + Vite + TS
    Vue 3 + Vite
    Node.js 服务端模板

✔ 模板已生成
✔ 依赖安装完成(用了 8.3s)

🎉 项目初始化完成!运行 cd my-app && npm run dev 开始开发
```

## 核心实现

工具的核心是一个简单的模板引擎,用正则替换模板里的占位符:

```ts
export function renderTemplate(content: string, vars: Record<string, string>) {
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
}
```

## 后续规划

- [ ] 支持更多官方模板
- [ ] 支持模板版本锁定
- [ ] 增加 `upgrade` 命令自动检测新版本
