import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hit, ipFrom, reset } from "@/lib/rateLimit";

// Thrown when someone tries too many passwords; the login page shows a "wait a bit" message.
class TooManyAttempts extends CredentialsSignin {
  code = "too_many";
}

// Checked against when the email has no account, so a wrong email takes as long as a wrong
// password and nobody can probe which emails are registered.
const DUMMY_HASH = "$2b$10$7c3PplWVAtTtYYLXZeRrOefMG9JK5D1wibTy/mrCIEt6Kipqzgy7W";
const WINDOW = 15 * 60 * 1000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  // A signed JWT in an HttpOnly, SameSite=Lax cookie (Secure on https). Sessions last 14 days,
  // refreshed at most once a day while you use the site; signing out deletes the cookie.
  session: { strategy: "jwt", maxAge: 14 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials, request) => {
        const raw = String(credentials?.email ?? "").trim().slice(0, 254);
        const email = raw.toLowerCase();
        const password = String(credentials?.password ?? "").slice(0, 200);
        if (!email || !password) return null;

        // At most 8 tries per email and 30 per IP address every 15 minutes.
        const ip = request instanceof Request ? ipFrom(request.headers) : "local";
        if (!hit(`login:email:${email}`, 8, WINDOW) || !hit(`login:ip:${ip}`, 30, WINDOW)) {
          throw new TooManyAttempts();
        }

        const user =
          (await db.user.findUnique({ where: { email } })) ??
          (raw !== email ? await db.user.findUnique({ where: { email: raw } }) : null);
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) return null;

        reset(`login:email:${email}`);
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
