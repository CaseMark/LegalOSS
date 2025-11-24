import { NextResponse } from "next/server";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${CASE_API_URL}/workflows/v1/search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CASE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Workflow search error:", response.status, errorData);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error searching workflows:", error);
    return NextResponse.json(
      { error: "Failed to search workflows" },
      { status: 500 }
    );
  }
}
