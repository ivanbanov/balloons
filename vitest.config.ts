import { defineConfig } from 'vitest/config'

// Every test runs in a bare `node` environment on purpose: core must stay
// substrate-free, and the dom package's SSR test only proves anything in a
// process with no `window`/`document` globals at all. Browser-behavioral
// coverage lives in `sandbox/`, not here.
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['packages/**/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
