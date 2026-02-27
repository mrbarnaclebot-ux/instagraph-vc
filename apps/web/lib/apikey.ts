const APIKEY_STORAGE_KEY = 'graphvc_openai_api_key'

export function getUserApiKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(APIKEY_STORAGE_KEY)
}

export function setUserApiKey(key: string): void {
  localStorage.setItem(APIKEY_STORAGE_KEY, key)
}

export function clearUserApiKey(): void {
  localStorage.removeItem(APIKEY_STORAGE_KEY)
}
