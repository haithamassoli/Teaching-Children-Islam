"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { type ReactNode, useState } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
  }
  const [client] = useState(() => new ConvexReactClient(url));
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
