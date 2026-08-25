#!/usr/bin/env bash
# ============================================================
# 数据备份:数据库 + 上传头像
# 每天 03:00 由 cron 调用,保留最近 7 份
# ============================================================
set -euo pipefail

APP_DIR="/var/www/blog"
BACKUP_DIR="/var/www/blog/backups"
DATE="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

# 1) 备份数据库(WAL 模式下先 checkpoint 保证一致性)
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 data/blog.db "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null 2>&1 || true
fi
cp data/blog.db "$BACKUP_DIR/blog-$DATE.db"

# 2) 备份上传的头像
tar -czf "$BACKUP_DIR/uploads-$DATE.tar.gz" -C dist/client uploads 2>/dev/null || true

# 3) 清理:只保留最近 7 份
ls -1t "$BACKUP_DIR"/blog-*.db 2>/dev/null | tail -n +8 | xargs -r rm -f
ls -1t "$BACKUP_DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f

echo "[backup] $DATE 完成, 目录: $BACKUP_DIR"
