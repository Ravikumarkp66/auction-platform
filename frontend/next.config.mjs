/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["avatar.iran.liara.run", "api.dicebear.com"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatar.iran.liara.run',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
