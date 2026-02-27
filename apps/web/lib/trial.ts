export const TRIAL_KEY = 'graphvc_trial_used'

export function isTrialUsed(): boolean {
  if (typeof window === 'undefined') return false  // SSR guard
  return localStorage.getItem(TRIAL_KEY) === 'true'
}

export function markTrialUsed(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TRIAL_KEY, 'true')
}
