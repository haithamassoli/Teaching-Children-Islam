import Resend from "@auth/core/providers/resend";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const email = Resend({
  apiKey: process.env.AUTH_RESEND_KEY,
  from: process.env.AUTH_EMAIL_FROM ?? "Teaching Children Islam <onboarding@resend.dev>",
  maxAge: 15 * 60,
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      verify: email,
      reset: email,
      profile(params) {
        const email = typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
        if (!email?.includes("@")) {
          throw new Error("Invalid email");
        }
        return { email };
      },
    }),
  ],
});
