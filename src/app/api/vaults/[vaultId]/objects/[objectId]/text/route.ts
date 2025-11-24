import { NextResponse } from "next/server";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vaultId: string; objectId: string }> }
) {
  try {
    const { vaultId, objectId } = await params;
    
    const response = await fetch(
      `${CASE_API_URL}/vault/${vaultId}/objects/${objectId}/text`,
      {
        headers: {
          "Authorization": `Bearer ${CASE_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Failed to fetch text for object ${objectId}:`, response.status, errorData);
      return NextResponse.json(
        { error: errorData.message || `Failed to fetch text: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching object text:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch text" },
      { status: 500 }
    );
  }
}



