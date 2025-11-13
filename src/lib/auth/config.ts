/**
 * NextAuth configuration
 * Following Open WebUI's auth pattern
 */
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authenticateUser } from "./utils";

export const authConfig = {
  pages: {
    signIn: "/auth/v1/login",
    signOut: "/auth/v1/login",
    error: "/auth/v1/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await authenticateUser(credentials.email as string, credentials.password as string);

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAuth = nextUrl.pathname.startsWith("/auth");

      // Protect dashboard routes
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        // Redirect to login with callback
        return Response.redirect(new URL(`/auth/v1/login?callbackUrl=${nextUrl.pathname}`, nextUrl));
      }

      // Redirect logged-in users from auth pages to dashboard
      if (isOnAuth && isLoggedIn) {
        return Response.redirect(new URL("/dashboard/default", nextUrl));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
