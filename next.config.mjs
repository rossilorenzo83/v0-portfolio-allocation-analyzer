/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Add polyfills for Node.js modules in the browser environment
    if (!isServer) {
      config.resolve.fallback = {
        fs: false, // fs is a Node.js module, not available in browser
        path: false, // path is a Node.js module, not available in browser
        // Add other Node.js modules if needed, e.g., crypto: false
      };
    }
    return config;
  },
}

export default nextConfig
