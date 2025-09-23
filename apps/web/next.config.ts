import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
	/* config options here */
	reactStrictMode: true,
	transpilePackages: [
		"@cossistant/api",
		"@cossistant/core",
		"@cossistant/location",
		"@cossistant/react",
		"@cossistant/transactional",
		"@cossistant/types",
	],
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		remotePatterns: [new URL("https://cdn.cossistant.com/**")],
	},
	devIndicators: false,
};

export default withMDX(nextConfig);
