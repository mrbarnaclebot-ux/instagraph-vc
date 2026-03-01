import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getTrialCount, getTrialRemaining, isTrialExhausted, incrementTrial } from '@/lib/trial'

// Mock localStorage and window (trial.ts guards on typeof window === 'undefined')
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

describe('getTrialCount', () => {
  it('returns 0 when no trials used', () => {
    expect(getTrialCount()).toBe(0)
  })

  it('returns stored count', () => {
    store['graphvc_trial_count'] = '2'
    expect(getTrialCount()).toBe(2)
  })

  it('migrates legacy boolean flag', () => {
    store['graphvc_trial_used'] = 'true'
    expect(getTrialCount()).toBe(1)
    expect(store['graphvc_trial_count']).toBe('1')
    expect(store['graphvc_trial_used']).toBeUndefined()
  })
})

describe('getTrialRemaining', () => {
  it('returns 3 when no trials used', () => {
    expect(getTrialRemaining()).toBe(3)
  })

  it('returns 1 when 2 trials used', () => {
    store['graphvc_trial_count'] = '2'
    expect(getTrialRemaining()).toBe(1)
  })

  it('returns 0 when all trials used', () => {
    store['graphvc_trial_count'] = '3'
    expect(getTrialRemaining()).toBe(0)
  })

  it('does not go negative', () => {
    store['graphvc_trial_count'] = '10'
    expect(getTrialRemaining()).toBe(0)
  })
})

describe('isTrialExhausted', () => {
  it('returns false when trials remain', () => {
    store['graphvc_trial_count'] = '2'
    expect(isTrialExhausted()).toBe(false)
  })

  it('returns true at limit', () => {
    store['graphvc_trial_count'] = '3'
    expect(isTrialExhausted()).toBe(true)
  })

  it('returns true over limit', () => {
    store['graphvc_trial_count'] = '5'
    expect(isTrialExhausted()).toBe(true)
  })
})

describe('incrementTrial', () => {
  it('increments from 0 to 1', () => {
    incrementTrial()
    expect(store['graphvc_trial_count']).toBe('1')
  })

  it('increments from 2 to 3', () => {
    store['graphvc_trial_count'] = '2'
    incrementTrial()
    expect(store['graphvc_trial_count']).toBe('3')
  })
})
