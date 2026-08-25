/** 通用 HTTP 工具 */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new Error('请求体不是合法 JSON');
  }
}

/** 生成唯一 slug:中文标题自动回退为时间戳风格 */
export function genSlug(prefix: string, base: string | undefined): string {
  const b = (base || '').trim().toLowerCase();
  const safe = b.replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return safe || `${prefix}-${Date.now().toString(36)}`;
}
