/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'portfoliowebsite-images.s3.us-east-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.us-east-1.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Disable development indicators
  devIndicators: {
    buildActivity: false,
  },
  // Turbopack configuration
  turbopack: {
    // Disable overlay
    rules: {},
  },
}

module.exports = nextConfig
