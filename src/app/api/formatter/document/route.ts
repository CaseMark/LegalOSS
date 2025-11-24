import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();

    const upstream = await fetch(`${CASE_API_URL}/format/v1/document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const errorPayload = await upstream.json().catch(() => ({ error: "Formatter service error" }));
      return NextResponse.json(errorPayload, { status: upstream.status });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentDisposition =
      upstream.headers.get("content-disposition") || `attachment; filename=\"formatted.${body?.output_format || "pdf"}\"`;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Formatter document error:", error);
    return NextResponse.json({ error: "Failed to format document" }, { status: 500 });
  }
}



