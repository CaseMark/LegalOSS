import { NextRequest, NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/session";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

/**
 * GET /api/ocr/[jobId]/results
 * Get OCR result file URLs (for vault-based jobs)
 * Returns presigned URLs if results are in a vault bucket
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    await requirePermission("ocr.read");

    if (!CASE_API_KEY) {
      return NextResponse.json({ error: "CASE_API_KEY not configured" }, { status: 500 });
    }

    const { jobId } = await params;

    // Get job status
    const jobResponse = await fetch(`${CASE_API_URL}/ocr/v1/${jobId}`, {
      headers: { Authorization: `Bearer ${CASE_API_KEY}` },
    });

    if (!jobResponse.ok) {
      return NextResponse.json({ error: "Failed to get OCR job" }, { status: jobResponse.status });
    }

    const jobData = await jobResponse.json();

    if (jobData.status !== "completed") {
      return NextResponse.json(
        {
          error: "Job not completed",
          status: jobData.status,
          progress: `${jobData.chunks_completed}/${jobData.chunk_count}`,
        },
        { status: 400 },
      );
    }

    // Check if results are in a vault bucket
    const resultBucket = jobData.result_bucket;
    const resultPrefix = jobData.result_prefix;

    if (!resultBucket || !resultBucket.startsWith("case-vault")) {
      return NextResponse.json(
        {
          error: "Results not stored in vault",
          message:
            "This OCR job was not processed from a vault. Results are in Vision's internal storage and require Case.dev to add download endpoints.",
          s3Keys: {
            text: jobData.result_text_key,
            json: jobData.result_json_key,
            pdf: jobData.result_pdf_key,
          },
        },
        { status: 501 },
      );
    }

    // Extract vaultId from bucket name
    // Bucket format: case-vault-user-org-{orgId}-{vaultId}
    const vaultIdMatch = resultBucket.match(/case-vault-user-org-[^-]+-(.+)$/);
    if (!vaultIdMatch) {
      return NextResponse.json({ error: "Could not extract vault ID from bucket name" }, { status: 500 });
    }

    const vaultId = vaultIdMatch[1];
    console.log(`[OCR Results] Results are in vault ${vaultId}`);

    // TODO: Create vault objects for each result file and generate presigned URLs
    // For now, return the S3 locations
    return NextResponse.json({
      vaultId,
      bucket: resultBucket,
      prefix: resultPrefix,
      files: {
        text: jobData.result_text_key,
        json: jobData.result_json_key,
        pdf: jobData.result_pdf_key,
      },
      message: "Results are in vault bucket. Use vault download endpoints to access them.",
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message?.includes("Permission denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("[OCR Results] Error:", error);
    return NextResponse.json({ error: "Failed to get OCR results" }, { status: 500 });
  }
}
