import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/vaults - List all vaults directly from Case.dev
 * Case.dev is the source of truth for vault data
 */
export async function GET() {
  try {
    await requirePermission("vaults.read");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    // Fetch directly from Case.dev API (endpoint is /vault singular)
    const response = await fetch(`${CASE_API_URL}/vault`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json({ error: error.message || "Failed to list vaults" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ vaults: data.vaults || data });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error listing vaults:", error);
    return NextResponse.json({ error: "Failed to list vaults" }, { status: 500 });
  }
}

/**
 * POST /api/vaults - Create a new vault in Case.dev
 */
export async function POST(request: NextRequest) {
  try {
    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    // Require authentication and permission
    await requirePermission("vaults.create");

    const body = await request.json();
    const { name, description, enableGraph = false } = body;

    if (!name) {
      return NextResponse.json({ error: "Vault name is required" }, { status: 400 });
    }

    // Create vault in Case.dev
    const response = await fetch(`${CASE_API_URL}/vault`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify({ name, description, enableGraph }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      return NextResponse.json({ error: error.message || "Failed to create vault" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error creating vault:", error);
    return NextResponse.json({ error: "Failed to create vault" }, { status: 500 });
  }
}
