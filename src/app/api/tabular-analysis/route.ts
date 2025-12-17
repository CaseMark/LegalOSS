import { NextResponse } from "next/server";

import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { tabularAnalyses, cases } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

const CreateAnalysisSchema = z.object({
  vaultId: z.string().optional(),
  caseId: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  documentIds: z.array(z.string().min(1)).min(1),
  columns: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        prompt: z.string(),
        dataType: z.enum(["text", "number", "date", "boolean"]),
        order: z.number(),
      }),
    )
    .default([]),
  modelId: z.string().optional(),
});

// POST - Create a new tabular analysis
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const body = await request.json();
    const validated = CreateAnalysisSchema.parse(body);

    // If caseId provided, verify access
    if (validated.caseId) {
      const [caseRecord] = await db
        .select()
        .from(cases)
        .where(and(eq(cases.id, validated.caseId), eq(cases.userId, user.id)))
        .limit(1);

      if (!caseRecord) {
        return NextResponse.json({ error: "Case not found or access denied" }, { status: 404 });
      }
    }

    // Create the analysis
    const [analysis] = await db
      .insert(tabularAnalyses)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        caseId: validated.caseId || null,
        vaultId: validated.vaultId || null,
        name: validated.name,
        description: validated.description || null,
        documentIds: JSON.stringify(validated.documentIds),
        columns: JSON.stringify(validated.columns),
        modelId: validated.modelId || "anthropic/claude-sonnet-4.5",
        status: "draft",
      })
      .returning();

    return NextResponse.json({ analysisId: analysis.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("Error creating analysis:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - List analyses for current user
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    const conditions = [eq(tabularAnalyses.userId, user.id)];
    if (caseId) {
      conditions.push(eq(tabularAnalyses.caseId, caseId));
    }

    const analyses = await db
      .select()
      .from(tabularAnalyses)
      .where(and(...conditions))
      .orderBy(desc(tabularAnalyses.createdAt))
      .limit(50);

    return NextResponse.json(analyses);
  } catch (error) {
    console.error("Error fetching analyses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
