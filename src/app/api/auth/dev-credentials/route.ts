import { NextResponse } from "next/server";
import { getDevCredentials, isDevMode, seedDevData } from "@/lib/auth/dev-seed";

/**
 * GET /api/auth/dev-credentials
 * Returns dev credentials for pre-filling login form (only in dev mode)
 * 
 * IMPORTANT: This endpoint also ensures the dev seed has completed
 * before returning credentials, preventing race conditions.
 */
export async function GET() {
  if (!isDevMode()) {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  // Ensure dev data is seeded before returning credentials
  // This blocks until seeding is complete
  await seedDevData();

  const credentials = getDevCredentials();

  return NextResponse.json({
    isDevMode: true,
    credentials,
  });
}
