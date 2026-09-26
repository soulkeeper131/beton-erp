/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdf-parse v2 ползва pdfjs-dist с отделен worker файл — при bundle-ване worker-ът
    // липсва („Setting up fake worker failed“), затова се зарежда от node_modules
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
};
export default nextConfig;
