import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { format } from "@/lib/case-dev";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content, outputFormat, title } = body;

    if (!content) {
      return NextResponse.json({ error: "Missing required field: content" }, { status: 400 });
    }

    if (outputFormat !== "pdf" && outputFormat !== "docx") {
      return NextResponse.json({ error: 'Invalid format. Must be "pdf" or "docx"' }, { status: 400 });
    }

    console.log("[export] Formatting document:", { outputFormat, title, contentLength: content.length });

    // Call Case.dev Format API
    const buffer = await format.document({
      content,
      input_format: "md",
      output_format: outputFormat,
      options: {
        template: "standard",
      },
    });

    console.log("[export] Document formatted successfully:", { bytes: buffer.byteLength });

    // Return as binary response with proper headers
    const sanitizedTitle = (title || "Document")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);

    const filename = `${sanitizedTitle}.${outputFormat}`;
    const contentType =
      outputFormat === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[export] Failed to export artifact:", err);
    return NextResponse.json({ error: "Failed to export artifact" }, { status: 500 });
  }
}
