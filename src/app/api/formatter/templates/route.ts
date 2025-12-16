import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const url = new URL(`${CASE_API_URL}/format/v1/templates`);
    const type = request.nextUrl.searchParams.get("type");
    if (type) {
      url.searchParams.set("type", type);
    }

    const upstream = await fetch(url, {
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
    console.error("Formatter templates GET error:", error);
    return NextResponse.json({ error: "Failed to fetch formatter templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();

    const upstream = await fetch(`${CASE_API_URL}/format/v1/templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await upstream.json().catch(() => ({ error: "Malformed formatter response" }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Formatter templates POST error:", error);
    return NextResponse.json({ error: "Failed to create formatter template" }, { status: 500 });
  }
}





