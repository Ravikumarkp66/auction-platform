/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["avatar.iran.liara.run", "api.dicebear.com"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
