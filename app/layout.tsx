import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { siteDescription, siteName, siteUrl } from "../lib/site";
import Pwa from "./pwa";
import "./globals.css";
import "./journey.css";

const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic"] });

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
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-[family-name:var(--font-cairo)]">
        <Pwa />
        {children}
      </body>
    </html>
  );
}
