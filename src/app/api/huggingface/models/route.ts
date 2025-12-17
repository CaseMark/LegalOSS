import { NextRequest, NextResponse } from "next/server";

// HuggingFace Hub API - no auth needed for public models
const HF_API = "https://huggingface.co/api";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const limit = searchParams.get("limit") || "20";

  try {
    // Search models filtered for text-generation (LLMs)
    const url = new URL(`${HF_API}/models`);
    url.searchParams.set("search", search);
    url.searchParams.set("limit", limit);
    url.searchParams.set("sort", "downloads");
    url.searchParams.set("direction", "-1");
    url.searchParams.set("filter", "text-generation");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const models = await response.json();

    // Transform and estimate VRAM requirements
    const results = models.map((model: any) => {
      // Estimate VRAM based on model name/size
      const vram = estimateVram(model.id);

      return {
        id: model.id,
        name: model.id.split("/").pop(),
        author: model.author || model.id.split("/")[0],
        downloads: model.downloads || 0,
        likes: model.likes || 0,
        tags: model.tags || [],
        pipeline: model.pipeline_tag || "text-generation",
        lastModified: model.lastModified,
        vram,
        params: extractParams(model.id),
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("HuggingFace models error:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}

// Estimate VRAM requirements based on model name
function estimateVram(modelId: string): number {
  const id = modelId.toLowerCase();

  // Extract size from model name
  if (id.includes("70b") || id.includes("72b")) return 140;
  if (id.includes("65b")) return 130;
  if (id.includes("40b")) return 80;
  if (id.includes("34b") || id.includes("33b")) return 68;
  if (id.includes("30b")) return 60;
  if (id.includes("27b")) return 54;
  if (id.includes("22b")) return 44;
  if (id.includes("13b") || id.includes("14b")) return 28;
  if (id.includes("8b") || id.includes("9b")) return 18;
  if (id.includes("7b")) return 16;
  if (id.includes("3b") || id.includes("4b")) return 8;
  if (id.includes("2b")) return 5;
  if (id.includes("1b") || id.includes("1.5b")) return 4;
  if (id.includes("500m") || id.includes("350m")) return 2;

  return 16; // Default estimate
}

// Extract parameter count from model name
function extractParams(modelId: string): string {
  const id = modelId.toLowerCase();

  const patterns = [
    /(\d+\.?\d*)b/i, // 7b, 70b, 1.5b
    /(\d+)m/i, // 350m, 500m
  ];

  for (const pattern of patterns) {
    const match = id.match(pattern);
    if (match) {
      return match[0].toUpperCase();
    }
  }

  return "Unknown";
}
