import type { Metadata } from "next";
export const metadata: Metadata = { title: "حساب الأسرة", robots: { index: false, follow: false } };

import { notFound } from "next/navigation";
import FamilyApp from "../family-app";
import { Providers } from "../providers";

export default function FamilyPage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    notFound();
  }
  return (
    <Providers>
      <FamilyApp />
    </Providers>
  );
}
