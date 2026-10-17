/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@resvg/resvg-js', 'sharp'],
  experimental: { serverActions: { bodySizeLimit: '11mb' } },
};
export default config;
