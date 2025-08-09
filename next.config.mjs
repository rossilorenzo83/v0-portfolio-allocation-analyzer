/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  // Removed the rewrite rule that was causing CORS issues
  // Our API routes handle the Yahoo Finance API calls server-side
  webpack: (config, { isServer }) => {
    // For PDF.js worker
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, // Disable fs on the client side
        path: false, // Disable path on the client side
        net: false, // Disable net on the client side
        readline: false, // Disable readline on the client side
        electron: false, // Disable electron on the client side
      };
      
      // Exclude Playwright from client bundle
      config.externals = config.externals || [];
      config.externals.push({
        'playwright': 'playwright',
        'playwright-core': 'playwright-core',
        'chromium-bidi': 'chromium-bidi',
      });
    }

    return config;
  },
};

export default nextConfig;
