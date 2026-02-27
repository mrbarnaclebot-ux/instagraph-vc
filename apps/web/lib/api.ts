import type { GenerateResponse, APIError } from '@graphvc/shared-types'

export class GraphAPIError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: APIError,
  ) {
    super(detail.message ?? `API error ${status}`)
    this.name = 'GraphAPIError'
  }

  /** True if the error is a scrape failure — triggers the specific FE-05 toast */
  get isScrapeFailure(): boolean {
    return (
      this.status === 400 &&
      (this.detail.error?.includes('scrape') ||
        this.detail.error?.includes('invalid_url') ||
        this.detail.message?.toLowerCase().includes('scrape') ||
        this.detail.message?.toLowerCase().includes("couldn't read") ||
        this.detail.message?.toLowerCase().includes('hostname') ||
        this.detail.message?.toLowerCase().includes('resolve'))
    )
  }
}

export async function generateGraph(
  input: string,
  signal: AbortSignal,
  getToken?: (() => Promise<string | null>) | null,  // optional — anonymous callers pass null
): Promise<GenerateResponse> {
  const token = getToken ? await getToken() : null

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ input }),
    signal,
  })

  if (!response.ok) {
    let detail: APIError = { error: 'unknown_error', message: `HTTP ${response.status}` }
    try {
      detail = await response.json()
    } catch {
      // non-JSON error body — keep default
    }
    // Friendly message for 503 (Render free-tier cold start returns HTML, not JSON)
    if (response.status === 503 && detail.message === 'HTTP 503') {
      detail = {
        error: 'service_unavailable',
        message: 'Service is warming up — please wait a moment and try again',
      }
    }
    throw new GraphAPIError(response.status, detail)
  }

  const data: GenerateResponse = await response.json()
  return data
}
