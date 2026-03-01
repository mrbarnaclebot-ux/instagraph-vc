import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@graphvc/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
    },
  },
})
