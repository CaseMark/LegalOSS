import { NextResponse } from "next/server";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vaultIdsParam = searchParams.get("vaultIds");

  if (!vaultIdsParam) {
    return NextResponse.json({ objects: [] });
  }

  const vaultIds = vaultIdsParam.split(",").filter(Boolean);

  if (vaultIds.length === 0) {
    return NextResponse.json({ objects: [] });
  }

  try {
    const promises = vaultIds.map(async (vaultId) => {
      try {
        const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects`, {
          headers: {
            Authorization: `Bearer ${CASE_API_KEY}`,
          },
        });

        if (!response.ok) {
          console.error(`Failed to fetch objects for vault ${vaultId}: ${response.status}`);
          return [];
        }

        const data = await response.json();
        // Map API fields to frontend interface
        return (data.objects || []).map((obj: any) => ({
          id: obj.id,
          name: obj.filename,
          type: obj.contentType,
          size: obj.sizeBytes || 0,
          ingestionStatus: obj.ingestionStatus,
          createdAt: obj.createdAt,
          vaultId,
        }));
      } catch (error) {
        console.error(`Error fetching objects for vault ${vaultId}:`, error);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const allObjects = results.flat();

    return NextResponse.json({ objects: allObjects });
  } catch (error) {
    console.error("Error fetching multi-vault objects:", error);
    return NextResponse.json({ error: "Failed to fetch objects" }, { status: 500 });
  }
}
