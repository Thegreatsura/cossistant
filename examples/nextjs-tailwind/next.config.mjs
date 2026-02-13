/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@cossistant/core",
    "@cossistant/react",
    "@cossistant/next",
    "@cossistant/types"
  ],
  devIndicators: false
};

export default nextConfig;
