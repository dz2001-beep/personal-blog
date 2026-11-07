# AGENTS.md — 项目速览

> **给下一个 AI / 新协作者看的项目说明书。** 读完这一份就能上手改代码,不用重新摸一遍。
>
> 项目:个人博客「DZ Blog」(DZ-Star),全栈 SSR 站点,内容存在自己的 SQLite 里,自带网页后台。
> 当前版本 **2.8.1** ｜ 最近更新 2026-11 ｜ 仓库 `dz2001-beep/personal-blog`(public) ｜ 分支 `main`

---

## 0. 30 秒上手

```bash
cd /Users/dz/workspace/个人博客
npm install            # 已有 node_modules 可跳过
npm run dev            # → http://localhost:4321  (开发模式,热更新)
npm run build          # SSR 构建到 dist/
npm start              # 跑构建产物(node dist/server/entry.mjs,默认 4321)
```

- **后台**:`/admin`,账号 `admin`,密码默认 `admin123`(首次运行由 `ADMIN_PASSWORD` 环境变量决定,**上线前必须改**)
- **数据库**:`data/blog.db`(SQLite,不入 git,删掉会自动重建并重新迁移示例内容)
- **需要 Node ≥ 22.5**:代码用内置 `node:sqlite`,低版本直接崩
- 三份文档:`AGENTS.md`(本文,给 AI)｜`README.md`(给访客/使用者)｜`DEPLOY.md`(部署手册)

---

## 1. 技术栈

| 层 | 选型 | 版本 | 说明 |
| --- | --- | --- | --- |
| 框架 | Astro | ^7.2.6 | `output: 'server'`,SSR + 客户端路由(`ClientRouter`) |
| 适配器 | @astrojs/node | ^11.1.4 | `mode: 'standalone'` → `dist/server/entry.mjs` |
| 内容 | @astrojs/mdx、marked | ^7 / ^18 | 文章存数据库,渲染走 marked + shiki |
| 数据库 | `node:sqlite` | Node 内置 | `DatabaseSync`,WAL 模式,零原生依赖 |
| 进程守护 | PM2 | 全局安装 | 生产用 `ecosystem.config.cjs`(仓库里目前没有,见 §9.2) |
| 反代 | Caddy | 系统包 | 自动 HTTPS,见 `DEPLOY.md` |
| 前端 | 原生 TS + CSS | — | **没有 React/Vue/Tailwind**,组件全是 `.astro` |
| 图库 | `@astrojs/sitemap` | 已安装但**未启用** | sitemap 是手写路由 `src/pages/sitemap.xml.ts` |

⚠️ **两个未声明的直接依赖**(今天是靠传递依赖跑起来的):`shiki`(4.4.3)、`js-yaml`(4.3.1)。
`src/lib/md.ts` 用了 shiki、`src/lib/db.ts` 用了 js-yaml 解析 frontmatter。
**建议修复**:`npm i shiki js-yaml` 显式写进 `package.json`,否则升级 astro 可能突然断掉。

---

## 2. 目录结构

```
├── AGENTS.md                # 本文(给 AI 的项目速览)
├── README.md                # 对外介绍 + 更新记录
├── DEPLOY.md                # 部署手册(服务器/PM2/Caddy/备份/排错)
├── astro.config.mjs         # SSR + node adapter + mdx + 代码高亮主题
├── package.json             # 脚本:dev / build / preview / start
├── data/blog.db             # SQLite(已 gitignore,首次运行自动生成)
├── public/                  # 静态资源:avatar.svg、touxiang.jpg、cursor.*、gallery/*
├── docs/screenshots/        # README 用的界面截图
├── deploy/                  # ⚠️ 目录已空(脚本在 926c8cc 被误删,见 §9.2)
└── src/
    ├── config.ts            # 站点默认配置(SITE / SOCIAL / AVATAR / 首页图)
    ├── middleware.ts        # 保护 /admin 与 /api/admin
    ├── content/             # 旧 Markdown(首次启动迁移进数据库,可保留作备份)
    ├── data/                # ⚠️ 注意:是源码,不是数据库(曾被 .gitignore 误伤)
    │   ├── profile.ts       # 关于页:经历/教育/技能(结构化)
    │   ├── gallery.ts       # 相册条目(src + title)
    │   ├── widgets.ts       # 一言列表、友链、音乐歌单配置 MUSIC
    │   └── kitchen.ts       # 菜品数据 + 照片自动识别(DISHES / coverOf)
    ├── lib/
    │   ├── db.ts            # 数据层:建表/迁移/CRUD/设置项
    │   ├── auth.ts          # 密码哈希(scrypt)+ HMAC 会话
    │   ├── md.ts            # Markdown → HTML(marked + shiki)
    │   ├── http.ts          # json()/readJson()/genSlug() 小工具
    │   └── music.ts         # 歌单抓取 + 缓存 + 音频代理
    ├── layouts/             # BaseLayout(前台) / AdminLayout(后台)
    ├── components/          # 见 §5
    ├── scripts/             # 客户端交互,见 §5.6
    ├── styles/global.css    # 设计 token + 全站样式(约 1100 行)
    ├── utils/               # format.ts(日期) / md.ts(行内 markdown)
    └── pages/               # 路由,见 §4
```

---

## 3. 数据层

### 3.1 位置与初始化

- 路径:环境变量 `DB_PATH`,默认 `process.cwd()/data/blog.db`
- 首次启动(`initApp()`,在 `db.ts` 末尾直接调用):建表 → 迁移 `src/content/*.md` → 若无用户则创建 `admin`(密码取 `ADMIN_PASSWORD`,缺省 `admin123`)
- WAL 模式;备份前需 `PRAGMA wal_checkpoint(TRUNCATE)`

### 3.2 表结构

| 表 | 字段 |
| --- | --- |
| `posts` | id, slug, title, description, content(Markdown), tags(JSON 字符串), status(`published`/`draft`), created_at, updated_at, views |
| `works` | id, slug, title, description, content, tech(JSON 字符串), demo_url, repo_url, featured(0/1), created_at, updated_at |
| `settings` | key, value —— 目前只有 `session_secret`,站点信息保存后会在此存 JSON |
| `users` | id, username, password_hash, created_at |

### 3.3 站点配置的读取优先级

`getSiteConfig()`:**先读 `settings` 表 → 缺失字段回退 `src/config.ts` 的 `SITE`**。
所以「后台设置里没动过」时,改 `src/config.ts` 立即生效;后台保存过就以数据库为准。

---

## 4. 路由与 API

### 4.1 页面路由

| 路径 | 文件 | 说明 |
| --- | --- | --- |
| `/` | `pages/index.astro` | 首页:整屏封面 + 简介 + 统计 + 最近文章/作品/相册 + 侧栏(§5.5/5.6) |
| `/about` | `pages/about.astro` | 关于我:头像卡 + 简介 + 技能/经历 + 小组件条 |
| `/about-site` | `pages/about-site.astro` | 关于本站:站点信息 + 技术栈 + 改版记录(changelog 数组)+ 致谢 |
| `/blog` | `pages/blog/index.astro` | 文章列表:标签筛选 + 搜索 + 侧栏(音乐/一言/友链) |
| `/blog/[slug]` | `pages/blog/[...slug].astro` | 文章详情:左侧 TOC + 正文 + 浏览量自增 + 上下篇 |
| `/blog/tag/[tag]` | `pages/blog/tag/[tag].astro` | 标签页 |
| `/works` | `pages/works/index.astro` | 作品列表 |
| `/works/[slug]` | `pages/works/[...slug].astro` | 作品详情 |
| `/gallery` | `pages/gallery.astro` | 相册:瀑布流 + 灯箱 |
| **`/kitchen`** | `pages/kitchen/index.astro` | **下厨**:左列表 + 右常驻详情面板(见 §5.4) |
| **`/kitchen/[slug]`** | `pages/kitchen/[slug].astro` | 菜品独立页(分享/SEO 兜底,未知 slug → `Astro.rewrite('/404')`) |
| `/rss.xml` | `pages/rss.xml.ts` | RSS(取已发布文章) |
| `/sitemap.xml` | `pages/sitemap.xml.ts` | 手写 sitemap |
| `/admin` | `pages/admin/index.astro` | 后台仪表盘(统计 + 快捷入口) |
| `/admin/login` | `pages/admin/login.astro` | 登录(唯一公开的后台路径) |
| `/admin/posts/new`、`/admin/posts/[id]` | `pages/admin/posts/*` | 文章编辑器(Markdown + 实时预览) |
| `/admin/works/new`、`/admin/works/[id]` | `pages/admin/works/*` | 作品编辑器 |
| `/admin/settings` | `pages/admin/settings.astro` | 站点设置 + 头像上传 + 改密 |
| `404` | `pages/404.astro` | 404(带背景 + 小人物) |

### 4.2 API(全部返回 JSON,错误用 `json({error}, 4xx)`)

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/login` | — | 登录,写 `blog_session` cookie;5 分钟内 10 次失败则 429 |
| POST | `/api/logout` | — | 退出 |
| GET | `/api/music` | — | 歌单 JSON(服务端缓存 10 分钟,`?refresh=1` 强制刷新) |
| GET | `/api/music/stream?id=&server=` | — | 音频代理,透传 Range/206(兜底) |
| GET/POST/PUT/DELETE | `/api/admin/posts`、`/api/admin/posts/[id]` | ✅ | 文章 CRUD |
| GET/POST/PUT/DELETE | `/api/admin/works`、`/api/admin/works/[id]` | ✅ | 作品 CRUD |
| POST | `/api/admin/settings` | ✅ | 保存站点设置 |
| POST | `/api/admin/avatar` | ✅ | 头像上传(base64 → 写文件) |
| POST | `/api/admin/preview` | ✅ | Markdown 预览渲染 |
| POST | `/api/admin/password` | ✅ | 修改密码 |

`middleware.ts` 保护 `/admin/*` 与 `/api/admin/*`,未登录时页面 302 到 `/admin/login`、API 返回 401。

### 4.3 认证细节(`lib/auth.ts`)

- 密码:scrypt + 随机盐
- 会话:HMAC-SHA256 签名(`username.expires.sig`),失效 30 天,密钥存 `settings.session_secret`(首次自动生成)
- Cookie:HttpOnly + SameSite=Lax + `secure: import.meta.env.PROD`(**生产强制 Secure,HTTP 下后台登不进去**,见 §9.3)

---

## 5. 功能模块

### 5.1 文章系统
数据库驱动(Markdown 正文)→ `lib/md.ts` 用 marked 渲染 + shiki 高亮(主题 `github-dark-dimmed`)→ 详情页左侧自动生成 TOC 并滚动高亮;浏览量每次访问 +1(`views`);支持草稿(status)、标签(JSON 数组)、列表页实时搜索(纯前端过滤)。

### 5.2 作品集
`works` 表 + `WorkCard`;`featured` 控制首页精选;有 demo/repo 外链。

### 5.3 相册
`src/data/gallery.ts` 静态数组(`src` 指向 `public/gallery/*.jpg` + `title`),瀑布流布局 + 点击灯箱。图片来源 Unsplash(免费授权)。

### 5.4 下厨(kitchen)——**本项目最复杂的交互**

**设计目标(用户明确要求):点开菜品不跳页、不来回返回。**

- 桌面(>1024px):左侧列表 + 右侧 `position: sticky` 常驻详情面板;点卡片只切换右侧 DOM
- 移动(≤1024px):同一个面板变成底部抽屉(88vh),带拖拽手柄下滑关闭 + 遮罩 + 滚动锁(`html.sheet-open`)
- URL 用 `history.replaceState` 同步 `?dish=slug`:可分享/深链恢复,但**不污染返回键**
- 支持:筛选(全部/做过的/想学的)、上一道/下一道循环、键盘 `←` `→`、`Esc` 收起
- 每张卡片仍是真实 `<a href="/kitchen/<slug>/">`,JS 不可用/被爬/被分享时有兜底页

**关键实现点(改动时别踩)**:
1. 点击拦截**必须用捕获阶段**(`addEventListener('click', fn, true)`)——Astro `ClientRouter` 也在 `document` 注册 click 且更早,冒泡阶段拦不住,会被它当成站内跳转
2. 详情内容全部由 SSR 渲染进页面并 `hidden`,前端只切换显隐 → 零请求、SEO 可读
3. 列表是 flex 列 + `max-height` 滚动容器,**卡片必须 `flex: 0 0 auto`**,否则会被压扁(实测 123px→45px)

**数据模型**(`src/data/kitchen.ts`):`slug / type(cooked|wish) / name / tagline / date / attempts / duration / difficulty / rating / tags / ingredients[] / steps[]{text,minutes,tip} / failures[] / verdict / note / reason / source / cover`

**封面**:`src/assets/kitchen/<slug>.jpg|jpeg|png|webp` 自动识别(文件名 = slug);`<slug>-2.*`、`<slug>-3.*` 作为详情页补充照片(`extraPhotosOf()`)。**已取消自绘插画**,菜单里的菜必须都有真实照片。

### 5.5 音乐播放器(网络歌单)

- **服务端抓歌单**:`lib/music.ts` 调 Meting API(默认实例 `api.qijieya.cn`,备用 `api.injahow.cn`),规范化 + 内存缓存 10 分钟 + 多接口回退 + 抓取失败回退旧缓存
- **前端**:`/api/music` 拿数据 → 自绘播放器(封面/进度/音量/歌单搜索/上下曲),音量与上次选曲存 localStorage
- **兜底**:第三方音源失败自动切 `/api/music/stream` 代理;弱网用 `wantPlaying` + `canplay` 续播,不误判失败
- **跨页不断**:`ClientRouter` + `transition:persist="music-player"`
- 配置在 `src/data/widgets.ts` 的 `MUSIC`(换 `listId` 即换歌单)
- ⚠️ 第三方源不稳定:qijieya 给完整音轨,injahow 多为 30–60 秒片段;VIP 歌可能失败

### 5.6 氛围与交互层(装饰脚本)

`BaseLayout` 统一引入,全部监听 `astro:page-load` 且幂等(`dataset.bound` 守卫):

| 脚本 | 作用 |
| --- | --- |
| `site.ts` | 头像同步、打字机、滚动渐显、阅读进度条、回到顶部、文章搜索 |
| `background.ts` | Canvas:樱花飘落 + 星光 + 漂浮光斑 + 鼠标火花拖尾(`z-index: -2`) |
| `cursor.ts` | 自定义光标(彩色箭头 + 光晕) |
| `effects.ts` | 滚动视差、卡片 3D 倾斜、数字滚动、玻璃高光扫过(尊重 `prefers-reduced-motion`) |
| `pet.ts` | 左下角小宠物(点击说话,8 条台词) |
| `easter.ts` | Konami 彩蛋(↑↑↓↓←→←→BA)撒纸屑 |
| `mascot.ts` | 页面内小幽灵(`Mascot.astro`),点击说 12 条台词之一,窄屏隐藏 |
| `pageWidgets.ts` | 内页小组件条:实时时钟 / 一言轮播 / 随机来一篇 |
| `kitchen.ts` | 下厨面板交互(见 §5.4) |
| `music.ts` | 播放器状态机(见 §5.5) |

### 5.7 后台 admin

仪表盘(文章/作品/浏览量统计)、Markdown 编辑器 + 实时预览(POST `/api/admin/preview`)、草稿箱、站点设置、头像上传、修改密码。UI 在 `AdminLayout.astro`,`PostEditor`/`WorkEditor` 为编辑器组件。

---

## 6. 设计系统

### 6.1 色彩与质感 token(`src/styles/global.css`)

| token | 值 | 用途 |
| --- | --- | --- |
| `--bg` | `#0f1318` | 页面底色(深蓝黑,比 v1 更深) |
| `--bg-soft` / `--bg-softer` | `#171c24` / `#1f2631` | 卡片 / hover |
| `--border` / `--border-strong` | `#262e3a` / `#3a4557` | 边框 |
| `--text` / `--text-dim` / `--text-faint` | `#e6ebf2` / `#a8b3c2` / `#77839a` | 三级文字 |
| **`--accent` / `--accent-2`** | **`#e8b06b` / `#d99a55`** | **琥珀金:全站唯一彩色强调**(v1 时是近白色=等于没有) |
| `--green` / `--red` / `--yellow` | `#6fbf9b` / `#d97a6c` / `#e0b166` | 语义状态色(v1 时是灰的) |
| `--glass-gradient` / `--glass-solid` | 暖白高光渐变 + `rgba(23,28,36,.8)` | **所有卡片统一用这两个变量** |
| `--radius` / `--radius-sm` | 14px / 8px | 圆角 |
| **`--font-display`** | `'Songti SC','Source Han Serif SC','Noto Serif SC','STSong','SimSun',Georgia,serif` | **标题专用衬线**(v2 新增) |
| `--container` / `--container-wide` | 860px / 1400px | 正文宽 / 列表宽 |
| `--font-sans` / `--font-mono` | 系统字体栈 | 时间戳、序号用 mono |

### 6.2 内页背景系统

`BaseLayout` 接收 `bgImage` + `bgTint`,渲染固定层 `.page-bg`:
图片(轻微模糊压暗)+ 深色蒙层 + 每页独立色调光晕 + 细噪点。层级:`page-bg(-3) < canvas(-2) < 正文`。

| 页面 | 背景图 | 色调 |
| --- | --- | --- |
| 首页 | 自带封面(`COVER_IMAGE` + 简介区 `BODY_IMAGE`) | — |
| 文章列表 | `foggy-peaks` | 冷蓝 |
| 文章详情 | `sunset-field` | 暖橙 |
| 作品列表 / 详情 | `mountain-river` / `snow-mountain` | 青绿 / 冷蓝 |
| 关于我 | `forest` | 苔绿 |
| 关于本站 | `waterfall` | 湖蓝 |
| 相册 | `starry-night` | 紫罗兰 |
| 下厨 | `sunset-field` | **灶火暖色 `rgba(226,178,132,.18)`** |
| 404 | `beach` | 暖沙 |

### 6.3 卡片与层级

- 统一玻璃质感:`.panel` / `.side-card` / `.post-card` / `.work-card` / `.widget-card` / `.dish-card` 都用 `--glass-gradient, --glass-solid` + `backdrop-filter: blur`
- 统一 hover:上浮 2–3px + 边框变亮 + 阴影加深
- z-index 栈:页面背景 `-3` < 动效 canvas `-2` < 内容 `auto` < 回到顶部 `150` < 宠物 `590` < 移动抽屉 `320`/遮罩 `310` < 头部 `100`(sticky) < 光标 `9998`
- 页面头部统一结构:`.page-head > .page-kicker(英文小标签) + h1 + p + <Mascot />`

**主题 v2(2026-11)**:在 `global.css` 末尾追加了一段覆盖块,只做三件事——
1. **换字体**:`h1/h2/h3/.section-title/.page-head h1` 走 `--font-display`(宋体),正文仍是系统无衬线,形成"衬线标题 + 无衬线正文"的编辑感对比
2. **换色**:`--accent` 从近白色改成琥珀金 `#e8b06b`;链接 hover 不再靠降透明度,改成变强调色;焦点环 `:focus-visible` 用强调色(无障碍)
3. **换框**:卡片加 `inset 0 1px 0` 顶部微光 + 更柔和投影,`backdrop-filter` 12px→8px;悬停边框用 `color-mix()` 泛金

**卡片边角装饰(2026-11)**:全部用伪元素实现,不改组件结构——
- `.side-card` / `.panel` / `.widget-card`:`::after` 做成右上角一枚 11px **菱形贴纸**(琥珀金 + 白描边 + 投影),
  悬停旋转 `135deg` 并放大;`.side-card::before` 是左下角那颗 5px 小圆点
- `.post-card::after` / `.work-card::before` / `.dish-card::after`:右上角**折角(dog-ear)**,
  用三色 `linear-gradient(225deg)` 做出「亮面 → 折痕 → 透明」,悬停时从 22px 长到 30px
- 注意:`work-card` 的 `::after` 已被柔光占用,折角只好用 `::before`;`dish-card` 的 `::before` 是选中态左条,折角用 `::after`
- 贴纸用负偏移(`-5px`)探出卡片边,这些卡片**不能有 `overflow: hidden`**,否则会被裁掉

改主题色只需动 `--accent / --accent-2 / --accent-soft` 三个变量(试过:青玉 `#6fbf9b`、珊瑚 `#d9807a` 都能直接换)。

---

## 7. 当前实际内容清单

| 类型 | 数量 | 明细 |
| --- | --- | --- |
| 文章 | **6**(全部 published) | AI Agent 面试八股(14 个必考点) / DeepSeek Harness 源码解析 / 关键技术点详解 / 新手学习笔记 / 用 Astro 从零搭博客 / 欢迎来到我的博客 |
| 标签 | 15 个 | DeepSeek Harness(3 篇)、架构、AI Agent、学习笔记、面试、Astro、前端、教程、随笔、博客、源码解析、新人向、技术详解、术语、八股 |
| 作品 | **2** | 个人博客(本站)[Astro/TS/Markdown]、awesome-cli[Node.js/TS/CLI] |
| 相册 | **8** 张 | Unsplash 免费授权风景图 |
| 下厨 | **13** 道 | *做过的 2*:蒜苔炒肉、鱼香肉丝(用户自己做的)｜*想学的 11*:辣子鸡、回锅肉(2 张照片)、小炒肉、锅包肉、红烧肉、红烧排骨、肉末蒜苔、麻婆豆腐、皮蛋豆腐、凉拌豆腐丝、油焖大虾 |
| 菜品封面 | **14 张真实照片** | 全部实物照片(webp,多为 300px 左右的网页缩略图),无插画;回锅肉有 1 张补充照片 |
| 一言 | 15 条 | 中英混排金句(`src/data/widgets.ts`) |
| 友链 | 4 条 | Astro / MDN / GitHub / 掘金 |
| Profile | — | 经历、教育、技能分组(结构化,`src/data/profile.ts`) |

**内容态真实性提醒**:13 道菜都已有 `ingredients`+`steps`(含每步分钟数与关键提示)和错开的 `date`(2025-12 ~ 2026-11);但 `reason`(为什么想学)、`verdict`(值不值得再做)、`failures`(翻车记录)仍全空,只有蒜苔炒肉/鱼香肉丝写了 `note: 这是我自己做的`。步骤是按通用做法整理的,**不是用户的真实操作记录**,用户实际做过之后再替换。照片分辨率偏低(约 300px),详情大图会偏软。

---

## 8. 约定与风格(改代码前必读)

1. **全站中文**:注释、UI 文案、提交信息都用中文。
2. **组件脚本用 `<script>` 引入,不要在 frontmatter 里 `import` 客户端脚本** —— frontmatter 在服务端执行,`document` 未定义会直接把页面打成 500(踩过)。
3. **所有交互脚本必须**:监听 `astro:page-load` + 幂等守卫(重复执行不得重复绑定)。
4. **Astro scoped `<style>` 不会作用于 JS 动态创建的节点**(它们没有 `data-astro-cid-*`)。这类样式要放 `<style is:global>` 并用 `#容器id` 前缀限定范围(音乐歌单列表就是这么修的)。
5. 新增内页要给 `BaseLayout` 传 `bgImage` + `bgTint`,并在 `.page-head` 里放 `<Mascot />`。
6. 新卡片沿用 `--glass-gradient` / `--glass-solid`,不要再写死颜色。
7. 菜品照片放 `src/assets/kitchen/<slug>.(jpg|jpeg|png|webp)`(补充照片用 `<slug>-2`);**不使用插画**,数据改动只改 `src/data/kitchen.ts`。
8. 提交信息格式 `feat|fix|docs|style(scope): 中文描述`,正文写清"为什么改 + 踩了什么坑"。
9. **版本号三处同步**:`package.json`、`README.md` 更新记录、`src/pages/about-site.astro` 的 `changelog` 数组。
10. 不要提交:`data/`、`public/uploads/`、`.env*`、`dist/`、`.astro/`、`node_modules/`。

---

## 9. 已知问题与技术债(重要)

| # | 问题 | 现象 | 原因 | 状态/建议 |
| --- | --- | --- | --- | --- |
| 9.1 | **头像上传会丢** | 部署后头像 404 | 上传写到 `dist/client/uploads`,而 `npm run build` 清空 `dist/`(已实测确认) | 未修。建议:上传目录改 `UPLOAD_DIR` 环境变量指向 `data/uploads`,Caddy 直接 `file_server`,并纳入备份 |
| 9.2 | **`deploy/` 目录为空** | README 提到的 `setup-server.sh` 不存在 | 4 个脚本在提交 `926c8cc` 被误删(`git ls-files deploy/` 为空) | 恢复:`git checkout 926c8cc^ -- deploy/`;`DEPLOY.md` 已给出手工替代步骤 |
| 9.3 | **HTTP 下后台登不进去** | 登录后又被踢回登录页 | `login.ts` 里 `secure: import.meta.env.PROD` → 生产 Cookie 带 Secure,浏览器拒绝在明文 HTTP 保存 | 未改代码。方案:用 HTTPS(推荐)或 SSH 隧道访问后台;详见 `DEPLOY.md` §8.3 |
| 9.4 | scoped 样式对动态节点无效 | 列表项样式丢失(曾把歌单挤成一行文字) | Astro 作用域属性只加在模板节点上 | 已修:改用 `<style is:global>` + `#music-player` 前缀 |
| 9.5 | ClientRouter 抢占点击 | 点菜品卡片直接整页跳转 | 它的 click 监听比业务脚本先注册 | 已修:业务监听改**捕获阶段** |
| 9.6 | flex 子项被压缩 | 菜品加到 10 道后卡片从 123px 挤成 45px | 列表 `flex` 列 + `max-height`,子项默认可收缩 | 已修:`.dish-card { flex: 0 0 auto }` |
| 9.7 | `.gitignore` 误伤源码 | `src/data/*.ts` 从未入库,新 clone 构建失败 | 规则写成 `data/`(匹配任意层级) | 已修:改成根目录锚定 `/data/` |
| 9.8 | 依赖未声明 | `npm ci` 后可能找不到 shiki / js-yaml | 二者被直接 import 但只存在于传递依赖 | **未修**,建议 `npm i shiki js-yaml` |
| 9.9 | 站外图库不可用 | 无法按菜名自动找免费图 | Pexels/Pixabay 搜索 403、Openverse 不可达、Wikimedia 超时 | 现改为**只用用户提供的真实照片**,菜单与图片一一对应,不再生成插画 |
| 9.10 | 音乐第三方源不稳 | 偶发播不了/VIP 歌失败 | 依赖公益 Meting 实例 | 已有代理兜底 + 自动跳下一首;可换 `MUSIC.listId` 或自建解析 |

---

## 10. 改完怎么自查(经验证的方式)

```bash
# 1) 构建必须过
ASTRO_TELEMETRY_DISABLED=1 npm run build

# 2) 路由冒烟(dev 服务在跑时)
for p in / /about /blog /works /gallery /kitchen /about-site; do
  printf '%-14s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4321$p)"
done

# 3) 真交互验证:无头 Chrome + CDP 驱动(Evaluate/点击/键盘/截图)
#    历史上用这套验证过:音乐播放器 14 项、厨房交互 16 项、弱网容错、跨页续播
node -e "console.log('用 CDP 脚本驱动 http://localhost:4321')"

# 4) 视觉验收:Page.captureScreenshot 截图后人工/模型看图
```

⚠️ 这些 CDP 脚本目前**只在 `/tmp`(未入库)**,重开会话就没了。建议后续把可复用的测试脚本放进 `tools/`(如 `tools/cdp-kitchen.mjs`)并提交。

---

## 11. 部署

完整步骤见 **`DEPLOY.md`**,要点:

- 服务器 2C2G / Ubuntu 24.04 / Node ≥22.5 / 磁盘 40G+
- `git clone https://github.com/dz2001-beep/personal-blog.git /var/www/blog`
- PM2 用 `ecosystem.config.cjs`(`PORT=3000`、`HOST=127.0.0.1`、`DB_PATH` 绝对路径、首次的 `ADMIN_PASSWORD`)
- Caddy 反代 `:80`(纯 IP)或域名自动 HTTPS
- GitHub Actions:`push main` 触发 `.github/workflows/deploy.yml` → 服务器 `git pull && npm ci && npm run build && pm2 reload`
  - **当前状态:每次运行都失败** —— 服务器还没租,`SSH_HOST`/`SSH_USER`/`SSH_KEY` 三个 Secrets 未配置
- 备份:`deploy/backup.sh`(缺失,`DEPLOY.md` 给了等价脚本),cron 每天 3 点,保留 7 份

---

## 12. 讨论过但尚未实现

**内容形态**(为增加多样性):
`/now` 现在页、碎念流 `notes`(短想法)、`/uses` 装备清单、`/reading` 在读与读过、`/links` 收藏夹、文章系列(series)、`/archive` 归档页、「我放弃的方案」清单。

**内容待补**:
- 13 道菜的真实照片原图(当前是网页缩略图,约 300px)
- 每道菜的 `reason` / `verdict` / `failures`(仍空)
- 用户自己做的菜(目前只标记了蒜苔炒肉、鱼香肉丝)

**功能债**:厨房后台 CRUD(现在只能改代码加菜)、头像上传持久化、`deploy/` 恢复、显式声明 shiki/js-yaml。

**交互文案个性化**(讨论了但没动):把小人物台词、404 文案、空状态文案从"通用可爱"改成**个人口吻 + 带自嘲**,以体现"一个人的想法"。

---

## 13. 快速定位表(想改 X 就去 Y)

| 想改什么 | 去哪个文件 |
| --- | --- |
| 站点标题/描述/域名/首页文案 | `src/config.ts`(或后台「设置」) |
| 关于页的个人信息、技能、经历 | `src/data/profile.ts` |
| 相册图片与标题 | `src/data/gallery.ts` + `public/gallery/` |
| 一言、友链、音乐歌单 | `src/data/widgets.ts` |
| 菜品内容/字段 | `src/data/kitchen.ts` |
| 菜品封面图 | `src/assets/kitchen/<slug>.webp`(或 jpg/png) |
| 全站颜色/圆角/卡片质感 | `src/styles/global.css`(`:root` token) |
| 内页背景图与色调 | 各页面 `<BaseLayout bgImage=… bgTint=…>` |
| 导航项 | `src/components/Header.astro` 的 `navItems` |
| 页脚 | `src/components/Footer.astro` |
| 小人物台词 | `src/scripts/mascot.ts` 的 `LINES` |
| 小宠物台词 | `src/scripts/pet.ts` 的 `LINES` |
| 404 文案 | `src/pages/404.astro` |
| 文章渲染/代码高亮主题 | `src/lib/md.ts` + `astro.config.mjs` |
| 数据库 schema | `src/lib/db.ts` |
| 登录/会话/Cookie | `src/lib/auth.ts` + `src/pages/api/login.ts` |
| 后台保护范围 | `src/middleware.ts` |
