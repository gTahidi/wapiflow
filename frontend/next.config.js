/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Determine if we're in Docker or local development
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
