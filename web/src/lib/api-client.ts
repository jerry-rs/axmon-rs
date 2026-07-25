const BASE_URL = '/api'

interface RequestOptions extends RequestInit {
  params?: Record<string, string>
  timeout?: number
}

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, timeout, ...init } = options

  let url = `${BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  const controller = timeout != null ? new AbortController() : undefined
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : undefined

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: controller?.signal,
      ...init,
    })

    if (!res.ok) {
      throw new ApiError(res.status, `Request failed: ${res.status} ${res.statusText}`)
    }

    return res.json()
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export { apiClient, ApiError }
