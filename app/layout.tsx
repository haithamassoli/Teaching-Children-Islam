import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "تعليم الأطفال الإسلام",
  description: "رحلة تعليمية تفاعلية للأطفال من 6 إلى 10 سنوات",
  appleWebApp: { capable: true, title: "رحلتي", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#21695d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-[family-name:var(--font-cairo)]">
        {children}
      </body>
    </html>
  );
}
