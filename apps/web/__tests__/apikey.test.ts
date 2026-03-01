import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getUserApiKey, setUserApiKey, clearUserApiKey } from '@/lib/apikey'

const store: Record<string, string> = {}
const mockStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
}

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
  vi.stubGlobal('window', { localStorage: mockStorage })
  vi.stubGlobal('localStorage', mockStorage)
})

describe('getUserApiKey', () => {
  it('returns null when not set', () => {
    expect(getUserApiKey()).toBeNull()
  })

  it('returns stored key', () => {
    store['graphvc_openai_api_key'] = 'sk-test-123'
    expect(getUserApiKey()).toBe('sk-test-123')
  })
})

describe('setUserApiKey', () => {
  it('stores key', () => {
    setUserApiKey('sk-new-key')
    expect(store['graphvc_openai_api_key']).toBe('sk-new-key')
  })
})

describe('clearUserApiKey', () => {
  it('removes stored key', () => {
    store['graphvc_openai_api_key'] = 'sk-test'
    clearUserApiKey()
    expect(store['graphvc_openai_api_key']).toBeUndefined()
  })
})
