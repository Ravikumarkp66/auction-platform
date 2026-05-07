/** @type {import('next').NextConfig} */

import withPWA from 'next-pwa';

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatar.iran.liara.run',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'auction-platform-kp.s3.ap-south-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],

    unoptimized: true,
  },

  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5050';

    return [
      {
        source: '/api/:path((?!auth).*)',
        destination: `${backendUrl}/api/:path*`,
      },

      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },

      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  publicExcludes: ['!manifest.webmanifest'],
})(nextConfig);