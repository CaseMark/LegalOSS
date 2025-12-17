import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ templateId: string }> }) {
  try {
    await requireAuth();

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { templateId } = await params;
    if (!templateId) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const upstream = await fetch(`${CASE_API_URL}/format/v1/templates/${templateId}`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => ({ error: "Malformed formatter response" }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Formatter template detail error:", error);
    return NextResponse.json({ error: "Failed to fetch formatter template" }, { status: 500 });
  }
}
