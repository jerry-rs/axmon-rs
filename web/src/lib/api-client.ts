/**
 * 后端 REST API 的统一入口。所有接口都在 /api/v1 下（src/api/mod.rs），
 * 前缀集中在这里，各 feature 的 api 文件只写相对路径（如 "/metrics/cpu"）。
 *
 * 开发环境由 vite proxy 转发到 localhost:8080（vite.config.ts），
 * 生产环境前后端同源，因此这里永远只用相对路径，不配置域名。
 */
const API_BASE = "/api/v1";

/** HTTP 非 2xx 时抛出，保留状态码供调用方判断（404、429 之类的分支处理）。 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method: HttpMethod;
  /** 请求体，自动 JSON 序列化并带 Content-Type；undefined 表示无 body。 */
  body?: unknown;
}

/** 最底层的请求函数，api 对象的各方法是它的薄封装。 */
async function request<T>(path: string, { method, body }: RequestOptions): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new ApiError(res.status, `${method} ${path} failed (HTTP ${res.status})`);
  }
  // 204 No Content 没有响应体，直接 res.json() 会抛解析错误。
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string): Promise<T> => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: "DELETE" }),
};
