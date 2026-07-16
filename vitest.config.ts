import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/{engine,services,stores}/**/*.ts',
        'src/components/**/*.tsx',
        'src/pages/**/*.tsx',
        'src/app/App.tsx',
      ],
      exclude: [
        'src/{engine,services,stores}/**/index.ts',
        'src/components/**/index.ts',
        'src/stores/dependencies.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
})
