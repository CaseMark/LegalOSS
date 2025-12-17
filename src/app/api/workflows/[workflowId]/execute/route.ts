import { NextResponse } from "next/server";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export async function POST(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { workflowId } = await params;
    const body = await request.json();

    const response = await fetch(`${CASE_API_URL}/workflows/v1/${workflowId}/execute`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Workflow execution error:", response.status, errorData);
      return NextResponse.json(
        { error: errorData.message || errorData.error || `API Error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error executing workflow:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to execute workflow";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
