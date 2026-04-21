/** @type {import('next').NextConfig} */
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
    return [
      {
        source: '/api/:path((?!auth).*)',
        destination: 'http://127.0.0.1:5050/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:5050/uploads/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://127.0.0.1:5050/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
