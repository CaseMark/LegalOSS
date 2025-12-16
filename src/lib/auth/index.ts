/**
 * Auth exports
 */
import NextAuth from "next-auth";
import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Re-export commonly used auth utilities
export { hasUsers, isSignupEnabled } from "./utils";
export { createFirstAdmin, createRegularUser, getSetupStatus, isSetupComplete } from "./setup";
