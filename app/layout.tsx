import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import localFont from "next/font/local";
import { siteDescription, siteName, siteUrl } from "../lib/site";
import Narration from "./narration";
import Pwa from "./pwa";
import "./globals.css";
import "./journey.css";

const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic"] });

const thmanyah = localFont({
  variable: "--font-thmanyah",
  src: [
    { path: "./fonts/thmanyahsans-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/thmanyahsans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/thmanyahsans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/thmanyahsans-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/thmanyahsans-Black.woff2", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: `${siteName} | تعليم الأطفال الإسلام`, template: `%s | ${siteName}` },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    type: "website",
    locale: "ar_AR",
    siteName,
    title: siteName,
    description: siteDescription,
  },
  twitter: { card: "summary_large_image", title: siteName, description: siteDescription },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: siteName, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#21695d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${thmanyah.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-[family-name:var(--font-cairo)]">
        <Pwa />
        {children}
        <Narration />
      </body>
    </html>
  );
}
