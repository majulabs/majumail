import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Resend from "next-auth/providers/resend";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";

// Use RESEND_DOMAIN for the from address, falling back to EMAIL_FROM env var
const resendDomain = process.env.RESEND_DOMAIN || "mail.rechnungs-api.de";
const emailFrom = process.env.EMAIL_FROM || `noreply@${resendDomain}`;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      from: emailFrom,
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=true",
    error: "/login",
  },
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  trustHost: true,
});