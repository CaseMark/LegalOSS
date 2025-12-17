import { eq, and, desc } from "drizzle-orm";

import { getDb } from "@/db";
import { artifacts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

// GET - List artifacts for current user (optionally filtered by chatId)
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");
    const artifactId = searchParams.get("id");

    // Get single artifact by ID
    if (artifactId) {
      const [artifact] = await db
        .select()
        .from(artifacts)
        .where(and(eq(artifacts.id, artifactId), eq(artifacts.userId, user.id)))
        .limit(1);

      if (!artifact) {
        return new Response("Artifact not found", { status: 404 });
      }

      return Response.json(artifact);
    }

    // Get artifacts by chatId or all user artifacts
    const whereClause = chatId
      ? and(eq(artifacts.userId, user.id), eq(artifacts.chatId, chatId))
      : eq(artifacts.userId, user.id);

    const userArtifacts = await db
      .select()
      .from(artifacts)
      .where(whereClause)
      .orderBy(desc(artifacts.updatedAt))
      .limit(50);

    return Response.json(userArtifacts);
  } catch (error) {
    console.error("GET /api/artifacts error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// POST - Create a new artifact
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = await getDb();
    const body = await request.json();
    const { id, title, content, kind, chatId, caseId } = body;

    const [artifact] = await db
      .insert(artifacts)
      .values({
        id: id || crypto.randomUUID(),
        userId: user.id,
        title,
        content: content || "",
        kind: kind || "text",
        chatId: chatId || null,
        caseId: caseId || null,
      })
      .returning();

    return Response.json(artifact);
  } catch (error) {
    console.error("POST /api/artifacts error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// PUT - Update an existing artifact
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = await getDb();
    const body = await request.json();
    const { id, title, content } = body;

    if (!id) {
      return new Response("Artifact ID required", { status: 400 });
    }

    const [artifact] = await db
      .update(artifacts)
      .set({
        title: title,
        content: content,
        updatedAt: new Date(),
      })
      .where(and(eq(artifacts.id, id), eq(artifacts.userId, user.id)))
      .returning();

    if (!artifact) {
      return new Response("Artifact not found", { status: 404 });
    }

    return Response.json(artifact);
  } catch (error) {
    console.error("PUT /api/artifacts error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

// DELETE - Delete an artifact
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("Artifact ID required", { status: 400 });
    }

    await db.delete(artifacts).where(and(eq(artifacts.id, id), eq(artifacts.userId, user.id)));

    return new Response("Deleted", { status: 200 });
  } catch (error) {
    console.error("DELETE /api/artifacts error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
