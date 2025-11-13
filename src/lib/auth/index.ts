/**
 * Auth exports
 */
import NextAuth from "next-auth";
import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export { createUser, hasUsers, isSignupEnabled } from "./utils";
