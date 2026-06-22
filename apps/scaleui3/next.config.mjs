/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@proto/devtools', '@proto/registry'],
  // Hide Next.js's built-in dev-tools indicator (the floating badge in dev).
  devIndicators: false,
};

export default nextConfig;
