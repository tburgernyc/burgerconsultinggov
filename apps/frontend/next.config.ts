import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['136.115.35.29'],
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
