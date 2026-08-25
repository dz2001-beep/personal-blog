/**
 * 数据层:SQLite(node:sqlite 内置模块,零原生依赖)
 * - 存储:文章 posts、作品 works、站点设置 settings、管理员 users
 * - 首次启动时自动把 src/content/ 下的旧 Markdown 内容迁移进数据库
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { SITE, SOCIAL, AVATAR } from '../config';
import { hashPassword } from './auth';

/** 数据库文件路径(生产环境可用环境变量 DB_PATH 覆盖) */
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'blog.db');

mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content     TEXT NOT NULL DEFAULT '',
    tags        TEXT NOT NULL DEFAULT '[]',
    status      TEXT NOT NULL DEFAULT 'published',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS works (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content     TEXT NOT NULL DEFAULT '',
    tech        TEXT NOT NULL DEFAULT '[]',
    demo_url    TEXT NOT NULL DEFAULT '',
    repo_url    TEXT NOT NULL DEFAULT '',
    featured    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
`);

/* ==================== Settings ==================== */

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, value);
}

export interface SiteConfig {
  title: string;
  description: string;
  author: string;
  url: string;
  heroTitle: string;
  heroTagline: string;
  shortName: string;
  avatar: string;
  bio: string;
  social: { github: string; email: string; twitter: string; juejin: string; zhihu: string };
}

/** 合并数据库设置与默认配置(数据库优先) */
export function getSiteConfig(): SiteConfig {
  const s = (key: string, fallback: string) => getSetting(key) ?? fallback;
  const socialRaw = getSetting('social');
  let social = { github: SOCIAL.github, email: SOCIAL.email, twitter: SOCIAL.twitter, juejin: SOCIAL.juejin, zhihu: SOCIAL.zhihu };
  if (socialRaw) {
    try {
      social = { ...social, ...JSON.parse(socialRaw) };
    } catch {
      /* ignore */
    }
  }
  return {
    title: s('title', SITE.title),
    description: s('description', SITE.description),
    author: s('author', SITE.author),
    url: s('url', SITE.url),
    heroTitle: s('heroTitle', SITE.heroTitle),
    heroTagline: s('heroTagline', SITE.heroTagline),
    shortName: s('shortName', SITE.shortName),
    avatar: s('avatar', AVATAR),
    bio: s('bio', ''),
    social,
  };
}

/* ==================== Users ==================== */

export function countUsers(): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  return row.n;
}

export function getUserByUsername(username: string): { username: string; password_hash: string } | undefined {
  return db.prepare('SELECT username, password_hash FROM users WHERE username = ?').get(username) as
    | { username: string; password_hash: string }
    | undefined;
}

export function createUser(username: string, password: string): void {
  db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)').run(
    username,
    hashPassword(password),
    new Date().toISOString()
  );
}

export function updatePassword(username: string, password: string): void {
  db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hashPassword(password), username);
}

/* ==================== Posts ==================== */

export interface Post {
  id: number;
  slug: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  status: 'published' | 'draft';
  created_at: string;
  updated_at: string;
}

function mapPost(row: Record<string, unknown>): Post {
  return {
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    description: row.description as string,
    content: row.content as string,
    tags: JSON.parse((row.tags as string) || '[]'),
    status: row.status as Post['status'],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function getPublishedPosts(): Post[] {
  const rows = db
    .prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(mapPost);
}

export function getAllPosts(): Post[] {
  const rows = db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map(mapPost);
}

export function getPostBySlug(slug: string): Post | undefined {
  const row = db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug) as Record<string, unknown> | undefined;
  return row ? mapPost(row) : undefined;
}

export function getPostById(id: number): Post | undefined {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapPost(row) : undefined;
}

export function createPost(data: Omit<Post, 'id' | 'created_at' | 'updated_at'>): number {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO posts (slug, title, description, content, tags, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(data.slug, data.title, data.description, data.content, JSON.stringify(data.tags), data.status, now, now);
  return Number(result.lastInsertRowid);
}

export function updatePost(id: number, data: Partial<Omit<Post, 'id' | 'created_at'>>): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE posts SET slug = ?, title = ?, description = ?, content = ?, tags = ?, status = ?, updated_at = ? WHERE id = ?`
  ).run(
    data.slug!,
    data.title!,
    data.description!,
    data.content!,
    JSON.stringify(data.tags ?? []),
    data.status!,
    now,
    id
  );
}

export function deletePost(id: number): void {
  db.prepare('DELETE FROM posts WHERE id = ?').run(id);
}

/* ==================== Works ==================== */

export interface Work {
  id: number;
  slug: string;
  title: string;
  description: string;
  content: string;
  tech: string[];
  demo_url: string;
  repo_url: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

function mapWork(row: Record<string, unknown>): Work {
  return {
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    description: row.description as string,
    content: row.content as string,
    tech: JSON.parse((row.tech as string) || '[]'),
    demo_url: row.demo_url as string,
    repo_url: row.repo_url as string,
    featured: Boolean(row.featured),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function getAllWorks(): Work[] {
  const rows = db.prepare('SELECT * FROM works ORDER BY created_at DESC').all() as Record<string, unknown>[];
  return rows.map(mapWork);
}

export function getFeaturedWorks(): Work[] {
  const rows = db
    .prepare('SELECT * FROM works WHERE featured = 1 ORDER BY created_at DESC')
    .all() as Record<string, unknown>[];
  return rows.map(mapWork);
}

export function getWorkBySlug(slug: string): Work | undefined {
  const row = db.prepare('SELECT * FROM works WHERE slug = ?').get(slug) as Record<string, unknown> | undefined;
  return row ? mapWork(row) : undefined;
}

export function getWorkById(id: number): Work | undefined {
  const row = db.prepare('SELECT * FROM works WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? mapWork(row) : undefined;
}

export function createWork(data: Omit<Work, 'id' | 'created_at' | 'updated_at'>): number {
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO works (slug, title, description, content, tech, demo_url, repo_url, featured, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.slug,
      data.title,
      data.description,
      data.content,
      JSON.stringify(data.tech),
      data.demo_url,
      data.repo_url,
      data.featured ? 1 : 0,
      now,
      now
    );
  return Number(result.lastInsertRowid);
}

export function updateWork(id: number, data: Partial<Omit<Work, 'id' | 'created_at'>>): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE works SET slug = ?, title = ?, description = ?, content = ?, tech = ?, demo_url = ?, repo_url = ?, featured = ?, updated_at = ? WHERE id = ?`
  ).run(
    data.slug!,
    data.title!,
    data.description!,
    data.content!,
    JSON.stringify(data.tech ?? []),
    data.demo_url ?? '',
    data.repo_url ?? '',
    data.featured ? 1 : 0,
    now,
    id
  );
}

export function deleteWork(id: number): void {
  db.prepare('DELETE FROM works WHERE id = ?').run(id);
}

/* ==================== 旧内容迁移(首次启动) ==================== */

function parseFrontmatter(file: string): { data: Record<string, unknown>; body: string } {
  const text = readFileSync(file, 'utf-8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = (yaml.load(m[1]) as Record<string, unknown>) || {};
  return { data, body: m[2] || '' };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 首次启动时,把 src/content/blog 和 src/content/works 下的 Markdown 导入数据库 */
export function migrateLegacyContent(): void {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM posts').get() as { n: number }).n;
  if (count > 0) return;

  const blogDir = path.join(process.cwd(), 'src', 'content', 'blog');
  const worksDir = path.join(process.cwd(), 'src', 'content', 'works');

  if (existsSync(blogDir)) {
    for (const file of readdirSync(blogDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))) {
      try {
        const { data, body } = parseFrontmatter(path.join(blogDir, file));
        const base = slugify(file.replace(/\.mdx?$/, ''));
        const createdAt = data.pubDate ? new Date(String(data.pubDate)).toISOString() : new Date().toISOString();
        createPost({
          slug: data.slug ? String(data.slug) : base,
          title: String(data.title || base),
          description: String(data.description || ''),
          content: body.trim(),
          tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
          status: data.draft ? 'draft' : 'published',
        });
        // 用 frontmatter 里的日期覆盖创建时间
        db.prepare('UPDATE posts SET created_at = ? WHERE slug = ?').run(createdAt, String(data.slug || base));
      } catch (e) {
        console.warn(`[migrate] 跳过 ${file}:`, e);
      }
    }
  }

  if (existsSync(worksDir)) {
    for (const file of readdirSync(worksDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))) {
      try {
        const { data, body } = parseFrontmatter(path.join(worksDir, file));
        const base = slugify(file.replace(/\.mdx?$/, ''));
        const createdAt = data.pubDate ? new Date(String(data.pubDate)).toISOString() : new Date().toISOString();
        createWork({
          slug: data.slug ? String(data.slug) : base,
          title: String(data.title || base),
          description: String(data.description || ''),
          content: body.trim(),
          tech: Array.isArray(data.tech) ? data.tech.map(String) : [],
          demo_url: String(data.demoUrl || ''),
          repo_url: String(data.repoUrl || ''),
          featured: Boolean(data.featured),
        });
        db.prepare('UPDATE works SET created_at = ? WHERE slug = ?').run(createdAt, String(data.slug || base));
      } catch (e) {
        console.warn(`[migrate] 跳过 ${file}:`, e);
      }
    }
  }
}

/** 启动初始化:默认设置、默认管理员、旧内容迁移 */
export function initApp(): void {
  migrateLegacyContent();
  if (countUsers() === 0) {
    const pw = process.env.ADMIN_PASSWORD || 'admin123';
    createUser('admin', pw);
    console.warn(`[auth] 已创建默认管理员 admin/${pw},请尽快登录后台修改密码!`);
  }
}

initApp();
