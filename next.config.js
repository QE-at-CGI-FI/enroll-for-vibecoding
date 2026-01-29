/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(process.env.NODE_ENV === 'production' && {
    basePath: '/enroll-for-vibecoding',
    assetPrefix: '/enroll-for-vibecoding/',
  }),
};

module.exports = nextConfig;
