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

    const upstream = await fetch(`${CASE_API_URL}/convert/v1/download/${jobId}`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
    });

    if (!upstream.ok) {
      const errorPayload = await upstream.json().catch(() => ({ error: "Converter download error" }));
      return NextResponse.json(errorPayload, { status: upstream.status });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const disposition =
      upstream.headers.get("content-disposition") || `attachment; filename="converted-${jobId}.m4a"`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Convert download error:", error);
    return NextResponse.json({ error: "Failed to download converted file" }, { status: 500 });
  }
}



