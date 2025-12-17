import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/ocr/[jobId]/download/[type]
 * Proxy to Case.dev download endpoints (adds authentication)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string; type: string }> }) {
  try {
    await requirePermission("ocr.download");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { jobId, type } = await params;

    console.log(`[OCR Download Proxy] Downloading ${type} for job ${jobId}`);

    // Proxy to Case.dev download endpoint with authentication
    const response = await fetch(`${CASE_API_URL}/ocr/v1/${jobId}/download/${type}`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
      redirect: "follow",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[OCR Download Proxy] Failed: ${response.status} - ${errorText}`);
      return NextResponse.json({ error: `Download failed: ${response.status}` }, { status: response.status });
    }

    const content = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    console.log(`[OCR Download Proxy] ✓ Downloaded ${content.byteLength} bytes`);

    // Determine filename
    const extensions: Record<string, string> = {
      text: "txt",
      json: "json",
      pdf: "pdf",
      original: "pdf",
    };

    const filename = `ocr-${jobId}-${type}.${extensions[type] || "bin"}`;

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": content.byteLength.toString(),
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[OCR Download Proxy] Error:", error);
    return NextResponse.json({ error: "Failed to download OCR result" }, { status: 500 });
  }
}
