import { NextRequest, NextResponse } from "next/server";

// HuggingFace Hub API - no auth needed for public datasets
const HF_API = "https://huggingface.co/api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const limit = searchParams.get("limit") || "20";

  try {
    // Search datasets with filter for instruction/text datasets
    const url = new URL(`${HF_API}/datasets`);
    url.searchParams.set("search", search);
    url.searchParams.set("limit", limit);
    url.searchParams.set("sort", "downloads");
    url.searchParams.set("direction", "-1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const datasets = await response.json();

    // Transform to simpler format
    const results = datasets.map((ds: any) => ({
      id: ds.id,
      name: ds.id.split("/").pop(),
      author: ds.author || ds.id.split("/")[0],
      downloads: ds.downloads || 0,
      likes: ds.likes || 0,
      tags: ds.tags || [],
      description: ds.description || "",
      lastModified: ds.lastModified,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("HuggingFace datasets error:", error);
    return NextResponse.json({ error: "Failed to fetch datasets" }, { status: 500 });
  }
}
