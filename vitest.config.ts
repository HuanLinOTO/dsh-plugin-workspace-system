/**
 * Node by default; `tests/*.spec.tsx` that need a DOM opt into jsdom with
 * their own `@vitest-environment` pragma, which keeps the environment
 * choice next to the test that needs it.
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    css: false,
  },
})
