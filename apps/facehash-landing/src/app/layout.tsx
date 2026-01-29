import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
	display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_URL || "https://facehash.dev";

export const metadata: Metadata = {
	title: {
		default: "Facehash - Beautiful Minimalist Avatars for React",
		template: "%s | Facehash",
	},
	description:
		"Beautiful minimalist avatars from any string for React. Zero dependencies, pure CSS 3D effects, fully typed. Perfect for user profiles, chat apps, and AI agents.",
	keywords: [
		"avatar",
		"avatar generator",
		"react avatar",
		"minimalist avatar",
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
		title: "Facehash - Beautiful Minimalist Avatars for React",
		description:
			"Beautiful minimalist avatars from any string for React. Zero dependencies, pure CSS 3D effects, fully typed. Perfect for user profiles, chat apps, and AI agents.",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "Facehash - Beautiful Minimalist Avatars for React",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Facehash - Beautiful Minimalist Avatars for React",
		description:
			"Beautiful minimalist avatars from any string for React. Zero dependencies, pure CSS 3D effects, fully typed.",
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

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: "Facehash",
	applicationCategory: "DeveloperApplication",
	operatingSystem: "Any",
	description:
		"Beautiful minimalist avatars from any string for React. Zero dependencies, pure CSS 3D effects, fully typed.",
	url: "https://facehash.dev",
	author: {
		"@type": "Organization",
		name: "Cossistant",
		url: "https://cossistant.com",
	},
	offers: {
		"@type": "Offer",
		price: "0",
		priceCurrency: "USD",
	},
	license: "https://opensource.org/licenses/MIT",
	programmingLanguage: ["TypeScript", "JavaScript", "React"],
	keywords: [
		"avatar",
		"react",
		"deterministic",
		"component",
		"typescript",
		"css3d",
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
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires dangerouslySetInnerHTML
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
					type="application/ld+json"
				/>
			</head>
			<body className={`${geistMono.variable} font-mono antialiased`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
