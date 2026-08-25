/**
 * 日期格式化:统一输出 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 估算阅读时长(按中文 400 字/分钟)
 */
export function readingTime(body: string): number {
  const words = body.replace(/\s+/g, '').length;
  return Math.max(1, Math.round(words / 400));
}
