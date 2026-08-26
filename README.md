# 个人博客(全栈版)

基于 **Astro(SSR)+ SQLite** 的完整个人博客:前台是白色主题 + 动画的展示站,后台是网页管理界面,文章/作品/站点信息全部存在自己的数据库里。

## 📸 界面预览

![首页全页截图](docs/screenshot-home.png)

> 最新版本首页**全页面**截图(1440×2503,含 Hero / 最近文章 / 精选作品 / 相册 / 页脚);本地构建运行后截取,部署后可更新为线上域名截图。

## ✨ 功能

**前台**
- 👤 关于我:头像(支持上传)、个人简介、技术栈、经历
- 📝 技术文章:Markdown 渲染、代码高亮、目录、实时搜索、标签页、上一篇/下一篇
- 🚀 作品集:作品卡片、在线演示/源码链接、首页精选
- 🎬 动态背景:樱花飘落、星光闪烁、漂浮光斑、鼠标火花拖尾(每个页面跳转后都保持动画)
- 🖱 自定义光标 + 白色主题 + 页面过渡、hero 打字机、滚动渐显、阅读进度条、回到顶部
- 📐 加宽布局 + 头像紧贴左侧 Hero + 侧栏小组件(音乐播放器/一言轮播/网站统计/标签云/最新文章/友链)
- 🖼 相册页(瀑布流 + 灯箱预览)+ 🍜 关于本站页(技术栈/改版历史/致谢)
- 📡 RSS + Sitemap(动态生成)

**后台(`/admin`)**
- 🔐 管理员登录(会话 Cookie + 登录限流)
- ✍️ 在线写文章/作品:Markdown 编辑器 + 实时预览 + 草稿箱
- ⚙️ 站点设置:标题、简介、域名、Hero 文案、社交链接、个人简介
- 📷 头像上传:自动裁切压缩,全站生效
- 🔑 修改密码

**存储**
- 🗄 SQLite 数据库(`data/blog.db`,零外部依赖)
- 首次启动自动把 `src/content/` 下的旧 Markdown 迁移入库

## 🚀 本地运行

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # SSR 构建
npm start          # 运行生产服务(需先 build)
```

**首次登录后台**:打开 `/admin`,默认账号 `admin / admin123`,登录后**立即改密码**。

## 📁 项目结构

```
├── deploy/                  # 部署套件
│   ├── setup-server.sh      # 服务器一键初始化(Ubuntu)
│   ├── ecosystem.config.cjs # PM2 配置
│   ├── Caddyfile            # 反向代理 + 自动 HTTPS
│   └── backup.sh            # 定时备份(DB+头像,保留7份)
├── .github/workflows/       # GitHub Actions 自动部署
├── src/
│   ├── lib/                 # 核心逻辑
│   │   ├── db.ts            # SQLite 数据层(node:sqlite,零依赖)
│   │   ├── auth.ts          # 密码哈希 + 会话
│   │   ├── md.ts            # Markdown 渲染 + shiki 高亮
│   │   └── http.ts          # API 工具
│   ├── pages/
│   │   ├── index.astro      # 首页
│   │   ├── about.astro      # 关于我
│   │   ├── blog/            # 文章列表/详情/标签
│   │   ├── works/           # 作品列表/详情
│   │   ├── admin/           # 后台(登录/仪表盘/编辑器/设置)
│   │   └── api/             # 后端 API
│   ├── components/          # 前台组件 + admin 编辑器
│   ├── layouts/             # BaseLayout / AdminLayout
│   ├── scripts/site.ts      # 前台交互(打字机/渐显/搜索等)
│   ├── styles/global.css    # 白色主题 + 动画(CSS 变量换主题)
│   └── content/             # 旧 Markdown(首次启动自动迁移,可保留作备份)
├── data/                    # SQLite 数据库(自动生成,已 gitignore)
└── astro.config.mjs         # SSR + node adapter
```

## ☁️ 部署到服务器

见 `deploy/setup-server.sh`(一键脚本)与 `.github/workflows/deploy.yml`(push 自动部署)。

**流程概述**(详见交付文档):
1. 购买服务器(阿里云/腾讯云轻量 2核2G)+ 域名
2. 域名 ICP 备案(国内服务器必需,约 1–3 周)
3. 控制台安全组放行 80/443
4. `bash setup-server.sh <仓库地址> <域名>`
5. 配置 GitHub Actions 密钥,之后 `git push` 自动上线

**数据安全**:SQLite + 上传头像每天凌晨自动备份到服务器,保留 7 份;建议定期把 `backups/` 下载到本地。

## 🎨 个性化

| 想改什么 | 改哪里 |
| --- | --- |
| 站点信息(标题/域名/社交) | 后台「设置」在线修改 |
| 个人简介 | 后台「设置」在线修改 |
| 头像 | 后台「设置」上传;默认头像在 `public/touxiang.jpg`(替换该文件即可) |
| 技能/经历/教育(结构化) | `src/data/profile.ts` |
| 主题颜色/动画 | `src/styles/global.css` |
| 默认管理员密码 | 环境变量 `ADMIN_PASSWORD`(首启时) |

## 📄 License

MIT
