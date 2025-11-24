import { NextResponse } from "next/server";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await params;
    const response = await fetch(`${CASE_API_URL}/workflows/v1/${workflowId}`, {
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching workflow details:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow details" },
      { status: 500 }
    );
  }
}

