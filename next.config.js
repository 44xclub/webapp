/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'shtivwtjmejhzexiqwjr.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  headers: async () => [
    {
      source: '/manifest.json',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/manifest+json',
        },
      ],
    },
    {
      source: '/:path*',
      headers: [
        {
          key: 'Link',
          value: '</manifest.json>; rel="payment-method-manifest"',
        },
      ],
    },
  ],
}

module.exports = nextConfig
