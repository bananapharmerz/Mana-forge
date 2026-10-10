import NextAuth, { CredentialsSignin } from "next-auth";
import { humanCheck } from "@/lib/turnstile";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hit, ipFrom, reset } from "@/lib/rateLimit";
import { REF_COOKIE, referrerFromCode } from "@/lib/referral";
import { AGE_COOKIE, googleSignInOn } from "@/lib/googleSignIn";
import { emailHtml, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/site";

// Thrown when someone tries too many passwords; the login page shows a "wait a bit" message.
class TooManyAttempts extends CredentialsSignin {
  code = "too_many";
}
class HumanCheckFailed extends CredentialsSignin {
  code = "human_check";
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
        turnstile: {}, // Cloudflare Turnstile token (src/lib/turnstile.ts), when it's switched on
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
        if (!(await humanCheck(credentials?.turnstile, ip))) throw new HumanCheckFailed();

        const user =
          (await db.user.findUnique({ where: { email } })) ??
          (raw !== email ? await db.user.findUnique({ where: { email: raw } }) : null);
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) return null;

        reset(`login:email:${email}`);
        return { id: user.id, email: user.email, name: user.name ?? undefined, sv: user.sessionVersion } as { id: string; email: string; name?: string };
      },
    }),
    // "Continue with Google", only when AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are set (Coolify →
    // Environment Variables). Google only tells us the email address and that it's confirmed.
    ...(googleSignInOn() ? [Google({ authorization: { params: { prompt: "select_account" } } })] : []),
  ],
  callbacks: {
    // Google sign-in: an existing account with that (Google-confirmed) email signs in; a new one is
    // only created after the person ticked "I'm 16 or older" on the sign-up page (a 10-minute cookie),
    // otherwise they're sent there first. No password is set (they can add one with "forgot password").
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const email = String(profile?.email ?? "").trim().toLowerCase().slice(0, 254);
      if (!email || profile?.email_verified !== true) return "/login?error=google";
      const existing = await db.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } });
      if (existing) {
        if (!existing.emailVerifiedAt) await db.user.update({ where: { id: existing.id }, data: { emailVerifiedAt: new Date() } });
        return true;
      }
      const jar = await cookies();
      if (jar.get(AGE_COOKIE)?.value !== "1") return "/signup?google=1";
      const referredById = await referrerFromCode(jar.get(REF_COOKIE)?.value, email).catch(() => null);
      await db.user.create({
        data: { email, passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 10), emailVerifiedAt: new Date(), referredById },
      });
      void sendEmail({
        to: email,
        subject: `Welcome to ${SITE.name}`,
        text: `Welcome!\n\nYour ${SITE.name} account is ready (you signed up with Google).\nBuild a deck, browse commanders or start a game with friends:\n${SITE.url}/deck-builder\n\nIf you didn't create this account, you can ignore this email.`,
        html: emailHtml({
          heading: "Welcome!",
          body: `<p>Your ${SITE.name} account is ready (you signed up with Google). Build a Commander deck, browse every commander, or start a game with friends.</p><p style="color:#7a7488;font-size:13px">If you didn't create this account, you can ignore this email.</p>`,
          button: { label: "Start building", url: `${SITE.url}/deck-builder` },
        }),
      });
      return true;
    },
    async jwt({ token, user, account }) {
      if (user && account?.provider === "google") {
        // Google's own id isn't ours: look the account up by its (confirmed) email.
        const u = await db.user.findUnique({ where: { email: String(user.email ?? "").toLowerCase() }, select: { id: true, sessionVersion: true } });
        if (!u) return null;
        token.id = u.id;
        token.sv = u.sessionVersion;
        return token;
      }
      if (user) {
        token.id = user.id;
        token.sv = (user as { sv?: number }).sv ?? 0;
        return token;
      }
      // A password reset bumps the account's sessionVersion, which signs out every older session.
      if (token.id) {
        const u = await db.user.findUnique({ where: { id: token.id as string }, select: { sessionVersion: true } }).catch(() => undefined);
        if (u === null || (u && u.sessionVersion !== ((token.sv as number | undefined) ?? 0))) return null;
      }
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
