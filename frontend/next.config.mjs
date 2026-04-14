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
        source: '/api/((?!auth).*)',
        destination: 'http://3.108.196.205:5000/api/:1',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://3.108.196.205:5000/uploads/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://3.108.196.205:5000/socket.io/:path*',
      },
    ];
  },
};

export default nextConfig;
