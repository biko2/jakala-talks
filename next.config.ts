import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['msw', '@mswjs/interceptors'],
  turbopack: {
    root: path.join(__dirname)
  }
}

export default nextConfig
