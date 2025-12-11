import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";

// SECURITY: Only these emails can sign in
// This is enforced at multiple levels:
// 1. signIn callback rejects unauthorized emails
// 2. Login page validates before sending magic link
const ALLOWED_EMAILS = [
  "kueck.marcel@gmail.com",
  "hello@julien-scholz.dev",
] as const;

// Export for use in login validation
export function isEmailAllowed(email: string): boolean {
  return ALLOWED_EMAILS.includes(email.toLowerCase() as typeof ALLOWED_EMAILS[number]);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      from: "noreply@mail.rechnungs-api.de",
      apiKey: process.env.RESEND_API_KEY,
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=true",
    error: "/login?error=true",
  },
  callbacks: {
    async signIn({ user }) {
      // SECURITY: Only allow specific whitelisted emails
      if (!user.email) {
        console.warn("Sign-in attempt with no email");
        return false;
      }
      
      const allowed = isEmailAllowed(user.email);
      if (!allowed) {
        console.warn(`Unauthorized sign-in attempt: ${user.email}`);
      }
      return allowed;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  trustHost: true,
});
