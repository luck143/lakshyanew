/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep chunk filenames stable across builds. A cached page from a previous
  // build will still resolve its chunks after a redeploy, avoiding ChunkLoadError.
  generateBuildId: async () => 'lakshya-storefront',
  // Never cache the HTML/document. This guarantees the browser always fetches
  // fresh HTML that matches the running server's chunks (kills React #423 too).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
        ],
      },
    ];
  },
};
export default nextConfig;
