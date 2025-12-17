import { NextResponse } from "next/server";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export async function POST(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { workflowId } = await params;
    const body = await request.json();
    const { documents, options, variables } = body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json({ error: "No documents provided for combined execution" }, { status: 400 });
    }

    // 1. Fetch text for all documents in parallel
    const textPromises = documents.map(async (doc: { vaultId: string; id: string; name: string }) => {
      try {
        const response = await fetch(`${CASE_API_URL}/vault/${doc.vaultId}/objects/${doc.id}/text`, {
          headers: {
            Authorization: `Bearer ${CASE_API_KEY}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Failed to fetch text for ${doc.name}:`, response.status, errorData);
          throw new Error(errorData.message || `Failed to fetch text for ${doc.name}`);
        }

        const data = await response.json();

        // Validate response structure
        if (!data.text) {
          throw new Error(`No text returned for ${doc.name}`);
        }

        return `--- DOCUMENT START: ${doc.name} ---\n${data.text}\n--- DOCUMENT END: ${doc.name} ---\n\n`;
      } catch (error) {
        console.error(`Error getting text for doc ${doc.id}:`, error);
        throw error;
      }
    });

    const textParts = await Promise.all(textPromises);
    const combinedText = textParts.join("\n");

    // 2. Execute workflow with combined text
    const response = await fetch(`${CASE_API_URL}/workflows/v1/${workflowId}/execute`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CASE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          text: combinedText,
        },
        options,
        variables,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Workflow execution error:", response.status, errorData);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error executing combined workflow:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute workflow" },
      { status: 500 },
    );
  }
}
