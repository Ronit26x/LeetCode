import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { isAllowedGitHubLogin } from "@/lib/allowlist";

declare module "next-auth" {
  interface Session {
    user: { login: string } & DefaultSession["user"];
  }
}

const ALLOWED_LOGIN = process.env.ALLOWED_GITHUB_LOGIN ?? "Ronit26x";

/** A credentials provider for local development and Playwright. Never enabled in production. */
export const TEST_LOGIN =
  process.env.NODE_ENV !== "production" && process.env.AUTH_TEST_LOGIN
    ? process.env.AUTH_TEST_LOGIN
    : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    GitHub({ allowDangerousEmailAccountLinking: false }),
    ...(TEST_LOGIN
      ? [
          Credentials({
            id: "test",
            name: "Test login",
            credentials: {},
            authorize: async () => ({ id: "test-user", name: TEST_LOGIN, login: TEST_LOGIN }),
          }),
        ]
      : []),
  ],
  callbacks: {
    // The allowlist. Everything else about this instance assumes exactly one user.
    signIn({ account, profile }) {
      if (account?.provider === "github") return isAllowedGitHubLogin(profile, ALLOWED_LOGIN);
      if (account?.provider === "test") return TEST_LOGIN !== null;
      return false;
    },
    jwt({ token, profile, user }) {
      const fromProfile = (profile as { login?: unknown } | null)?.login;
      const fromUser = (user as { login?: unknown } | undefined)?.login;
      if (typeof fromProfile === "string") token.login = fromProfile;
      else if (typeof fromUser === "string") token.login = fromUser;
      return token;
    },
    session({ session, token }) {
      session.user.login = typeof token.login === "string" ? token.login : "";
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
