/**
 * PM2 进程管理配置
 * 用法: pm2 start ecosystem.config.cjs
 */
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
        // 生产数据库路径(默认 ./data/blog.db,基于 cwd)
        DB_PATH: '/var/www/blog/data/blog.db',
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
