const TRIAL_COUNT_KEY = 'graphvc_trial_count'
const LEGACY_KEY = 'graphvc_trial_used'
const MAX_TRIALS = 3

function migrate(): void {
  if (typeof window === 'undefined') return
  // One-time migration from old boolean flag
  if (localStorage.getItem(LEGACY_KEY) === 'true' && localStorage.getItem(TRIAL_COUNT_KEY) === null) {
    localStorage.setItem(TRIAL_COUNT_KEY, '1')
    localStorage.removeItem(LEGACY_KEY)
  }
}

export function getTrialCount(): number {
  if (typeof window === 'undefined') return 0
  migrate()
  return parseInt(localStorage.getItem(TRIAL_COUNT_KEY) ?? '0', 10)
}

export function getTrialRemaining(): number {
  return Math.max(0, MAX_TRIALS - getTrialCount())
}

export function isTrialExhausted(): boolean {
  return getTrialCount() >= MAX_TRIALS
}

export function incrementTrial(): void {
  if (typeof window === 'undefined') return
  migrate()
  const count = getTrialCount() + 1
  localStorage.setItem(TRIAL_COUNT_KEY, String(count))
}
