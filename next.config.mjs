/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
    ],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/yahoo/:path*',
        destination: 'https://yfapi.net/:path*', // Proxy to Yahoo Finance API
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // For PDF.js worker
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, // Disable fs on the client side
        path: false, // Disable path on the client side
      };
    }

    return config;
  },
};

export default nextConfig;
