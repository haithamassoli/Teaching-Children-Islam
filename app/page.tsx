import type { Metadata } from "next";
import { siteUrl } from "../lib/site";
import Logo from "./components/logo";

export const metadata: Metadata = { alternates: { canonical: siteUrl?.href } };

export default async function Home() {
  if (process.env.NODE_ENV !== "production" && process.env.CONTENT_PREVIEW === "true") {
    const { default: Preview } = await import("./components/preview");
    return <Preview />;
  }
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    const [{ Providers }, { default: FamilyApp }] = await Promise.all([
      import("./providers"),
      import("./family-app"),
    ]);
    return (
      <Providers>
        <FamilyApp />
      </Providers>
    );
  }

  return (
    <main className="production-landing">
      <Logo />
      <p>رِحلة الإسلام</p>
      <h1>قريبًا بإذن الله</h1>
      <span>يجري تجهيز رحلة تعليمية آمنة للأطفال.</span>
    </main>
  );
}
