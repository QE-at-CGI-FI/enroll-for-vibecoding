/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath: '/enroll-for-vibecoding',
  assetPrefix: '/enroll-for-vibecoding/',
};

module.exports = nextConfig;
