import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GraphAPIError, generateGraph } from '@/lib/api'

describe('GraphAPIError', () => {
  it('stores status and detail', () => {
    const err = new GraphAPIError(400, { error: 'scrape_failed', message: 'Could not scrape' })
    expect(err.status).toBe(400)
    expect(err.detail.error).toBe('scrape_failed')
    expect(err.message).toBe('Could not scrape')
    expect(err.name).toBe('GraphAPIError')
  })

  it('detects scrape failure by error field', () => {
    const err = new GraphAPIError(400, { error: 'scrape_failed', message: 'Something' })
    expect(err.isScrapeFailure).toBe(true)
  })

  it('detects scrape failure by message field', () => {
    const err = new GraphAPIError(400, { error: 'other', message: "Couldn't read the URL" })
    expect(err.isScrapeFailure).toBe(true)
  })

  it('does not flag non-scrape 400 as scrape failure', () => {
    const err = new GraphAPIError(400, { error: 'input_too_short', message: 'Input too short' })
    expect(err.isScrapeFailure).toBe(false)
  })

  it('does not flag 500 as scrape failure', () => {
    const err = new GraphAPIError(500, { error: 'scrape_failed', message: 'Scrape error' })
    expect(err.isScrapeFailure).toBe(false)
  })

  it('detects rate limit', () => {
    const err = new GraphAPIError(429, { error: 'rate_limited', message: 'Daily limit reached' })
    expect(err.isRateLimited).toBe(true)
  })

  it('does not flag non-429 as rate limited', () => {
    const err = new GraphAPIError(400, { error: 'rate_limited', message: 'Something' })
    expect(err.isRateLimited).toBe(false)
  })
})

describe('generateGraph', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    })
  })

  it('sends POST request with input', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        graph: { nodes: [], edges: [] },
        meta: { session_id: 'abc', token_count: 100, source_type: 'text', processing_ms: 500 },
      }),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    const result = await generateGraph('test input', new AbortController().signal)
    expect(result.graph).toBeDefined()
    expect(result.meta.session_id).toBe('abc')

    const fetchCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(fetchCall[0]).toBe('/api/generate')
    expect(JSON.parse(fetchCall[1].body).input).toBe('test input')
  })

  it('includes auth token when provided', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        graph: { nodes: [], edges: [] },
        meta: { session_id: 'x', token_count: 0, source_type: 'text', processing_ms: 0 },
      }),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    const getToken = async () => 'my-jwt-token'
    await generateGraph('input', new AbortController().signal, getToken)

    const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers
    expect(headers.Authorization).toBe('Bearer my-jwt-token')
  })

  it('throws GraphAPIError on 429', async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      json: async () => ({ error: 'rate_limited', message: 'Daily limit reached', retry_after: 3600 }),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    await expect(generateGraph('input', new AbortController().signal))
      .rejects.toThrow(GraphAPIError)

    try {
      await generateGraph('input', new AbortController().signal)
    } catch (e) {
      expect((e as GraphAPIError).status).toBe(429)
      expect((e as GraphAPIError).isRateLimited).toBe(true)
    }
  })

  it('throws GraphAPIError on 400', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      json: async () => ({ error: 'input_too_short', message: 'Input too short' }),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    await expect(generateGraph('input', new AbortController().signal))
      .rejects.toThrow(GraphAPIError)
  })

  it('provides friendly message for 503 HTML responses', async () => {
    const mockResponse = {
      ok: false,
      status: 503,
      json: async () => { throw new Error('not JSON') },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))

    try {
      await generateGraph('input', new AbortController().signal)
    } catch (e) {
      expect((e as GraphAPIError).status).toBe(503)
      expect((e as GraphAPIError).detail.message).toContain('warming up')
    }
  })
})
