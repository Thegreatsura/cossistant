import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
	display: "swap",
});

const siteUrl =
	process.env.NEXT_PUBLIC_URL || "https://facehash.cossistant.com";

export const metadata: Metadata = {
	title: {
		default: "Facehash - Deterministic Avatar Faces from Any String",
		template: "%s | Facehash",
	},
	description:
		"Generate unique, deterministic avatar faces from any string. Zero external assets, pure CSS 3D effects, fully typed. Perfect for user profiles, chat apps, and AI agents.",
	keywords: [
		"avatar",
		"avatar generator",
		"deterministic avatar",
		"react avatar",
		"generative avatar",
		"profile picture",
		"identicon",
		"user avatar",
		"ai agent avatar",
		"facehash",
		"react component",
		"typescript",
		"css 3d",
	],
	authors: [{ name: "Cossistant Team", url: "https://cossistant.com" }],
	creator: "Cossistant",
	publisher: "Cossistant",
	metadataBase: new URL(siteUrl),
	appleWebApp: {
		title: "Facehash",
		statusBarStyle: "default",
	},
	icons: {
		icon: [
			{
				url: "/favicon.svg",
				type: "image/svg+xml",
			},
		],
	},
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "/",
		siteName: "Facehash",
		title: "Facehash - Deterministic Avatar Faces from Any String",
		description:
			"Generate unique, deterministic avatar faces from any string. Zero external assets, pure CSS 3D effects, fully typed. Perfect for user profiles, chat apps, and AI agents.",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "Facehash - Deterministic Avatar Faces",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Facehash - Deterministic Avatar Faces from Any String",
		description:
			"Generate unique, deterministic avatar faces from any string. Zero external assets, pure CSS 3D effects, fully typed.",
		images: ["/og-image.png"],
		creator: "@cossistant",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	alternates: {
		canonical: "/",
	},
	category: "technology",
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#fafafa" },
		{ media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link href="https://fonts.googleapis.com" rel="preconnect" />
				<link
					crossOrigin="anonymous"
					href="https://fonts.gstatic.com"
					rel="preconnect"
				/>
			</head>
			<body className={`${geistMono.variable} font-mono antialiased`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
