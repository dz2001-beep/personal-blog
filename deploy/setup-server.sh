#!/usr/bin/env bash
# ============================================================
# 服务器一键初始化脚本(Ubuntu 22.04 / 24.04,以 root 运行)
# 用法: bash setup-server.sh <你的 Git 仓库地址> [域名]
# 示例: bash setup-server.sh https://github.com/you/blog.git www.example.com
# ============================================================
set -euo pipefail

REPO_URL="${1:?用法: bash setup-server.sh <Git仓库地址> [域名]}"
DOMAIN="${2:-}"
APP_DIR="/var/www/blog"
NODE_MAJOR=22

echo "==> 1/6 安装系统依赖"
apt-get update -y
apt-get install -y curl git build-essential ca-certificates

echo "==> 2/6 安装 Node.js $NODE_MAJOR (NodeSource)"
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
apt-get install -y nodejs
node -v && npm -v

echo "==> 3/6 安装 PM2"
npm install -g pm2

echo "==> 4/6 拉取代码并构建"
mkdir -p "$APP_DIR" "$APP_DIR/logs" "$APP_DIR/data"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
npm ci --no-audit --no-fund
npm run build

echo "==> 5/6 启动服务(PM2 + 开机自启)"
cp "$APP_DIR/deploy/ecosystem.config.cjs" "$APP_DIR/ecosystem.config.cjs"
pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save
pm2 startup systemd -u root --hp /root || true

echo "==> 6/6 安装 Caddy(自动 HTTPS)"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

if [ -n "$DOMAIN" ]; then
  sed "s/example.com/$DOMAIN/g" "$APP_DIR/deploy/Caddyfile" > /etc/caddy/Caddyfile
  caddy reload --config /etc/caddy/Caddyfile
fi

echo "==> 定时备份(每天 3 点,保留 7 份)"
cat > /etc/cron.d/blog-backup <<EOF
0 3 * * * root bash $APP_DIR/deploy/backup.sh >> $APP_DIR/logs/backup.log 2>&1
EOF
chmod +x "$APP_DIR/deploy/backup.sh"

echo ""
echo "=============================================="
echo "✅ 部署完成!"
echo "  - 服务: http://127.0.0.1:3000 (PM2 管理)"
if [ -n "$DOMAIN" ]; then
  echo "  - 线上: https://$DOMAIN"
fi
echo "  - 后台: https://$DOMAIN/admin (默认账号 admin/admin123,首次登录后请立即改密码)"
echo "  - 数据: $APP_DIR/data/blog.db (SQLite,自动备份)"
echo ""
echo "接下来你需要:"
echo "  1. 在云控制台安全组放行 80/443 端口"
echo "  2. 把域名 A 记录指向本服务器公网 IP"
echo "  3. (国内服务器)完成 ICP 备案后再解析域名"
echo "=============================================="
