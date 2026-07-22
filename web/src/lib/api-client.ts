const BASE_URL = '/api'

interface RequestOptions extends RequestInit {
  params?: Record<string, string>
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
  const { params, ...init } = options

  let url = `${BASE_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    ...init,
  })

  if (!res.ok) {
    throw new ApiError(res.status, `Request failed: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

export { apiClient, ApiError }