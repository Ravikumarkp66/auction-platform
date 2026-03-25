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
};

export default nextConfig;
