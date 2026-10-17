/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@resvg/resvg-js', 'sharp'],
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
};
export default config;
