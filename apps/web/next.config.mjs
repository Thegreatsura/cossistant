import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  reactCompiler: true,
  transpilePackages: [
    "@cossistant/api",
    "@cossistant/core",
    "@cossistant/location",
    "@cossistant/react",
    "@cossistant/next",
    "@cossistant/transactional",
    "@cossistant/types",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [new URL("https://cdn.cossistant.com/**")],
  },
  experimental: {
    useCache: true,
    turbopackFileSystemCacheForDev: true,
  },
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/:path*",
      },
    ];
  },
};

export default withMDX(nextConfig);
