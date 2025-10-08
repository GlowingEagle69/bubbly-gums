/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // If TypeScript errors also block builds, you can temporarily add:
  // typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
