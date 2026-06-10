import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  async rewrites() {
    return [
      {
        // Proxy Firebase's auth handler through our domain so sign-in stays
        // same-origin on iOS (avoids SFSafariViewController sessionStorage split).
        source: '/__/auth/:path*',
        destination: 'https://wc2026-pool-5693a.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
