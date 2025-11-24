import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    await requireAuth();

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const upstream = await fetch(`${CASE_API_URL}/convert/v1/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => ({ error: "Malformed convert response" }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Convert job detail error:", error);
    return NextResponse.json({ error: "Failed to fetch conversion job" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    await requireAuth();

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const upstream = await fetch(`${CASE_API_URL}/convert/v1/jobs/${jobId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
    });

    const payload = await upstream.json().catch(() => ({ error: "Malformed convert response" }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Convert job delete error:", error);
    return NextResponse.json({ error: "Failed to delete conversion job" }, { status: 500 });
  }
}



