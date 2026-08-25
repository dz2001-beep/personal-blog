import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 技术文章集合:src/content/blog/ 下的每个 .md / .mdx 文件就是一篇文章
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    /** 文章标题 */
    title: z.string(),
    /** 文章摘要(列表页和 SEO 使用) */
    description: z.string(),
    /** 发布日期 */
    pubDate: z.coerce.date(),
    /** 更新日期(可选) */
    updatedDate: z.coerce.date().optional(),
    /** 标签 */
    tags: z.array(z.string()).default([]),
    /** 设为 true 时文章不会出现在任何列表/页面中 */
    draft: z.boolean().default(false),
  }),
});

/**
 * 作品集合:src/content/works/ 下的每个 .md / .mdx 文件就是一个作品
 */
const works = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/works' }),
  schema: z.object({
    /** 作品名称 */
    title: z.string(),
    /** 作品简介 */
    description: z.string(),
    /** 完成/发布时间 */
    pubDate: z.coerce.date(),
    /** 使用到的技术栈 */
    tech: z.array(z.string()).default([]),
    /** 在线演示地址(可选,留空则不显示按钮) */
    demoUrl: z.union([z.string().url(), z.literal('')]).optional(),
    /** 源码仓库地址(可选,留空则不显示按钮) */
    repoUrl: z.union([z.string().url(), z.literal('')]).optional(),
    /** 设为 true 会在首页「精选作品」展示 */
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog, works };
