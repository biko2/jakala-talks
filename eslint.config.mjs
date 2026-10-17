import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'coverage/**',
      '.agents/**',
      'jest.config.js',
      'jest.setup.js',
      'next.config.*',
      'postcss.config.*',
      'public/mockServiceWorker.js',
    ],
  },
  ...nextVitals,
  ...nextTs,
]

export default eslintConfig
