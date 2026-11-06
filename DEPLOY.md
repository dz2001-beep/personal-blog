# 部署手册(从零到上线)

> 面向自购云服务器:2 核 2G、Ubuntu 24.04、纯 IP 访问起步。
> 从一台空服务器到网站可访问,约 20 分钟(不含装系统)。
>
> 仓库里的 `deploy/` 目录在提交 `926c8cc` 中被误删,所以本手册**不依赖**那些脚本,
> 所有步骤都是可直接复制执行的命令。文末「已知限制」记录了三个实测发现的问题,上线前务必读一遍。

---

## 0. 先选访问方案

| 方案 | 需要什么 | 能否登后台 | 适合谁 |
| --- | --- | --- | --- |
| **A. 公网 IP + HTTP** | 只要服务器 | ⚠️ 需额外手段,见 [§8.3](#83-http-下如何登录后台必须看) | 先跑起来看看效果 |
| **B. 公网 IP + 自签 HTTPS** | 只要服务器 | ✅ 浏览器首次警告一次 | 不买域名但要完整可用 |
| **C. 域名 + 真证书** | 域名(国内需 ICP 备案) | ✅ 无警告 | 长期正式运营(推荐) |

**为什么不建议长期用方案 A**:后台登录 Cookie 在生产构建下带 `Secure` 标记(实测见 [§8.3](#83-http-下如何登录后台必须看)),
浏览器会拒绝在明文 HTTP 上保存它,直接表现就是「输对密码 → 又跳回登录页」。

---

## 1. 架构

```
浏览器
  │  http://IP:80  或  https://域名:443
  ▼
Caddy(反向代理 + gzip + 安全响应头 + 证书)
  │  127.0.0.1:3000
  ▼
Astro SSR(node adapter standalone,由 PM2 守护)
  │
  ▼
SQLite  /var/www/blog/data/blog.db
```

- 应用只监听 `127.0.0.1:3000`,不直接暴露公网,所有流量由 Caddy 转发
- 数据库、日志、备份都在 `/var/www/blog` 下,**不在 git 里**,所以重新部署不会丢数据

## 2. 环境要求

| 项目 | 要求 | 说明 |
| --- | --- | --- |
| CPU/内存 | 2 核 2G(2G 建议加 swap) | `npm run build` 比较吃内存 |
| 系统 | Ubuntu 22.04 / 24.04 LTS | 不要 CentOS 7,Node 22 装不上 |
| Node.js | **≥ 22.5** | 代码使用内置 `node:sqlite`,低于此版本直接报错 |
| 磁盘 | 20G+,建议 40G | 依赖 + 构建产物 + 备份 |
| 出站网络 | 全放行 | 首页音乐歌单要访问第三方接口,出站受限会变成空列表 |

## 3. 初始化服务器

```bash
ssh root@<你的公网IP>

apt update && apt upgrade -y
apt install -y curl git build-essential ca-certificates

# 时区(后台会话有效期计算依赖时间)
timedatectl set-timezone Asia/Shanghai

# 2G 内存开 1G swap,避免构建被 OOM 杀掉
fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

**云控制台安全组**(不是服务器内部防火墙)入站规则:

| 端口 | 来源 | 用途 |
| --- | --- | --- |
| 22 | 你的公网 IP(不要 0.0.0.0/0) | SSH |
| 80 | 0.0.0.0/0 | HTTP |
| 443 | 0.0.0.0/0 | HTTPS(方案 B/C 需要) |

> 若你的厂商对未备案域名的 80 端口有限制,把端口换成 `8080` 等,访问地址相应带端口。

## 4. 安装 Node 22 与 PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

node -v
# 必须打印 node:sqlite OK true,否则后面的服务会启动失败
node -e "import('node:sqlite').then(m=>console.log('node:sqlite OK', !!m.DatabaseSync))"

npm i -g pm2
```

## 5. 拉取代码

仓库是 public,HTTPS 克隆无需配置密钥:

```bash
mkdir -p /var/www/blog
git clone https://github.com/dz2001-beep/personal-blog.git /var/www/blog
cd /var/www/blog
mkdir -p data logs
```

## 6. 配置 PM2

在服务器上创建 `/var/www/blog/ecosystem.config.cjs`:

```js
module.exports = {
  apps: [
    {
      name: 'blog',
      script: 'dist/server/entry.mjs',
      cwd: '/var/www/blog',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '127.0.0.1',
        DB_PATH: '/var/www/blog/data/blog.db',
        // 仅用于"首次创建管理员账号",账号建好后可删除这一行
        ADMIN_PASSWORD: '换成你的强密码',
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      out_file: '/var/www/blog/logs/out.log',
      error_file: '/var/www/blog/logs/err.log',
      time: true,
    },
  ],
};
```

两点说明:

- **`ADMIN_PASSWORD` 的生效时机**:管理员账号是**运行时**创建的(已验证:构建不会创建数据库文件),
  所以要在第一次 `pm2 start` 之前写好,否则会用默认的 `admin123`。
  首次创建时 `pm2 logs blog` 会打印一行 `[auth] 已创建默认管理员 admin/***`,看到它就说明账号已生成。
- **`DB_PATH` 必须写绝对路径**:PM2 的 `cwd` 变化时相对路径会指向别处。

## 7. 构建并启动

```bash
cd /var/www/blog
npm ci --no-audit --no-fund
npm run build

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup        # 把它打印出来的那行 sudo 命令复制执行一次,实现开机自启

pm2 logs blog --lines 40
curl -I http://127.0.0.1:3000     # 期望 HTTP/1.1 200
```

本地 3000 通了再往下做,否则先看 [§13 故障排查](#13-故障排查)。

## 8. Caddy 反向代理

安装:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  > /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

### 8.1 方案 A:纯 HTTP(只用 IP)

```caddyfile
:80 {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000

    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

### 8.2 方案 B:IP + 自签 HTTPS(推荐给不买域名的场景)

```caddyfile
https://<你的公网IP> {
    tls internal          # Caddy 内置 CA 给 IP 签自签证书
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

浏览器首次打开会提示"证书不受信任",手动继续即可;此后全站 HTTPS,后台可正常登录。

### 8.3 HTTP 下如何登录后台(必须看)

实测证据(生产构建,`curl -D` 抓响应头):

```
POST /api/login → 200 OK
set-cookie: blog_session=...; Path=/; HttpOnly; Secure; SameSite=Lax
```

`Secure` 标记意味着浏览器**只在 HTTPS 下保存这个 Cookie**。所以在方案 A(明文 HTTP)下,
密码输对了也会立刻被踢回登录页。三种解法,任选:

1. **改用方案 B 或 C**(一劳永逸,推荐)
2. **SSH 隧道**:访客照常访问 `http://IP`,你自己在本机执行
   ```bash
   ssh -L 8080:127.0.0.1:3000 root@<你的公网IP>
   ```
   然后浏览器开 `http://localhost:8080/admin`。浏览器把 localhost 视为安全上下文,
   `Secure` Cookie 可以正常保存,后台完全可用,且流量走加密隧道。
3. 改代码,把 `src/pages/api/login.ts` 里的 `secure: import.meta.env.PROD` 改成
   `secure: import.meta.env.PROD && process.env.COOKIE_SECURE !== 'false'`,
   再用环境变量关闭。**不建议**:后台密码会以明文过公网。

生效并检查:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl status caddy --no-pager
```

## 9. 首次上线验收

1. 打开站点首页 —— 文章、作品、相册、侧栏均正常
2. 打开 `/admin`,账号 `admin` + 你设的 `ADMIN_PASSWORD`
3. **立刻改密码**:后台 → 修改密码;改完删除 `ecosystem.config.cjs` 里的 `ADMIN_PASSWORD` 行并
   ```bash
   pm2 reload blog --update-env
   ```
4. 后台「设置」里把**站点 URL 改成实际访问地址**(如 `http://10.0.0.1` 或 `https://blog.example.com`):
   RSS 与 sitemap 的链接取自这个值,不填就是 `example.com`
5. 侧栏音乐应显示「100 首」并能播放。若为空,测服务器出站:
   ```bash
   curl -s -m 10 'https://api.qijieya.cn/meting/?server=netease&type=playlist&id=3778678' | head -c 120
   ```
6. 刷新页面确认登录态保持(`30 天有效`)

## 10. 自动部署(GitHub Actions)

服务器上生成专用密钥:

```bash
ssh-keygen -t ed25519 -C "github-actions-blog" -f ~/.ssh/gh_actions -N ""
cat ~/.ssh/gh_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/gh_actions          # 私钥全文,下一步用
```

GitHub 仓库 → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
| --- | --- |
| `SSH_HOST` | 服务器公网 IP |
| `SSH_USER` | `root`(或你的部署用户) |
| `SSH_KEY` | 上一步打印的**私钥全文**,含 `-----BEGIN` / `-----END` 行 |

之后本地 `git push` 到 `main` 会自动执行:

```
git pull --ff-only → npm ci → npm run build → pm2 reload blog --update-env
```

> 前提:必须先在服务器上按 §7 手动部署成功过一次(workflow 里写死了 `cd /var/www/blog`)。

## 11. 备份与恢复

创建 `/var/www/blog/deploy/backup.sh`:

```bash
mkdir -p /var/www/blog/deploy
cat > /var/www/blog/deploy/backup.sh <<'EOF'
#!/usr/bin/env bash
# 备份 SQLite 数据库,保留最近 7 份
set -euo pipefail
APP_DIR="/var/www/blog"
BACKUP_DIR="$APP_DIR/backups"
DATE="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

# WAL 模式下先 checkpoint,保证备份文件一致
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 data/blog.db "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null 2>&1 || true
fi

cp data/blog.db "$BACKUP_DIR/blog-$DATE.db"
ls -1t "$BACKUP_DIR"/blog-*.db 2>/dev/null | tail -n +8 | xargs -r rm -f
echo "[backup] $DATE 完成 → $BACKUP_DIR"
EOF

chmod +x /var/www/blog/deploy/backup.sh
bash /var/www/blog/deploy/backup.sh
ls -l /var/www/blog/backups/
```

每天 3 点自动备份:

```bash
cat > /etc/cron.d/blog-backup <<'EOF'
0 3 * * * root bash /var/www/blog/deploy/backup.sh >> /var/www/blog/logs/backup.log 2>&1
EOF
```

**恢复数据库**:

```bash
cd /var/www/blog
pm2 stop blog
cp backups/blog-20261105-030000.db data/blog.db
rm -f data/blog.db-wal data/blog.db-shm      # 关键:残留的 WAL 会让恢复失效
pm2 start blog
```

> 备份和网站放同一台机器不算安全,建议定时拉回本地:
> `scp root@<IP>:/var/www/blog/backups/*.db ./blog-backup/`

## 12. 日常运维

| 场景 | 命令 |
| --- | --- |
| 查看服务状态 | `pm2 ls` |
| 看实时日志 | `pm2 logs blog` |
| 看错误日志 | `tail -f /var/www/blog/logs/err.log` |
| 手动更新代码 | `cd /var/www/blog && git pull && npm ci && npm run build && pm2 reload blog --update-env` |
| 重启服务 | `pm2 reload blog`(平滑)/ `pm2 restart blog` |
| 看监听端口 | `ss -lntp \| grep -E '3000\|80\|443'` |
| Caddy 日志 | `journalctl -u caddy -n 50 --no-pager` |

## 13. 故障排查

| 现象 | 原因与处理 |
| --- | --- |
| `Cannot find module 'node:sqlite'` | Node 版本 < 22.5,重装 NodeSource 22.x 并确认 `node -v` |
| Caddy 返回 502 | 后端没起来:`pm2 ls` 看状态 → `pm2 logs blog` 看报错 → `curl -I http://127.0.0.1:3000` |
| 端口 3000 被占用 | `ss -lntp \| grep 3000` 找到进程,或改 `PORT` 并同步改 Caddyfile |
| 部署后服务没自动起 | 忘了 `pm2 save` / `pm2 startup`;补执行一次 |
| 后台登录又跳回登录页 | 见 [§8.3](#83-http-下如何登录后台必须看)(HTTP 下 `Secure` Cookie 不被保存) |
| 首页正常但后台 404 | 确认访问的是 `/admin`;`/admin` 未登录会 302 到 `/admin/login` |
| 音乐列表空 | 服务器出站被限,按 §9 第 5 条测试 |
| 上传头像后图片 404 | 见下方「已知限制 1」 |
| 构建被 OOM 杀掉 | 加 swap(§3),或临时 `NODE_OPTIONS=--max-old-space-size=1536` |

---

## 已知限制(实测确认,上线前必读)

### 1. 后台上传的头像会在下次部署时丢失

头像写入 `dist/client/uploads`,而 `npm run build` 会**清空 `dist/`**。
实测:在 `dist/client/uploads/` 放一个文件,重新构建后文件消失。

**临时方案**:不用后台上传,直接替换仓库里的 `public/touxiang.jpg` 再 push ——
`public/` 会随构建复制进 `dist/`,不会被清掉。

**根治方案**(尚未实施):上传目录改用 `UPLOAD_DIR` 环境变量指向 `/var/www/blog/uploads`,
再由 Caddy `file_server` 直接对外提供,同时纳入备份。

### 2. `deploy/` 部署套件缺失

`README` 与 `.github/workflows/deploy.yml` 都引用了 `deploy/setup-server.sh`、`ecosystem.config.cjs`、
`Caddyfile`、`backup.sh`,但这 4 个文件在提交 `926c8cc` 中被误删,`git ls-files deploy/` 为空。
本手册用等价的手工步骤替代;如需恢复,可从历史取回:

```bash
git checkout 926c8cc^ -- deploy/     # 在本地仓库执行,再提交推送
```

### 3. 生产环境会强制 `Secure` Cookie

见 [§8.3](#83-http-下如何登录后台必须看)。纯 HTTP 部署时后台不可用,访客浏览不受影响。
