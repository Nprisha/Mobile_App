/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // PWA Configuration for mobile app experience
  experimental: {
    appDir: false, // Using pages router for now
  },

  // Image optimization for logos and icons
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'lh3.googleusercontent.com' // For Google profile images
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // API routes configuration
  api: {
    bodyParser: {
      sizeLimit: '10mb', // For PDF uploads
    },
    responseLimit: false,
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ]
  },

  // Webpack configuration for PDF parsing
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle node modules that don't work in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      }
    }

    // Handle tesseract.js worker files
    config.resolve.alias = {
      ...config.resolve.alias,
      'tesseract.js': 'tesseract.js/dist/tesseract.min.js',
    }

    return config
  },

  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'next-auth.session-token',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
