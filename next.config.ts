import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@supabase/ssr'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
