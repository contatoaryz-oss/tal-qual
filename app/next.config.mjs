/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@resvg/resvg-js', 'sharp'],
  // As fontes da arte são lidas do disco em tempo de execução; sem isto a Vercel não as leva para o servidor.
  outputFileTracingIncludes: {
    '/**': ['./node_modules/@fontsource/inter/files/inter-latin-*-normal.woff', './node_modules/@fontsource/manrope/files/manrope-latin-*-normal.woff'],
  },
  experimental: { serverActions: { bodySizeLimit: '11mb' } },
};
export default config;
