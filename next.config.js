/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
