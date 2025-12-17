import { eq, desc, and } from "drizzle-orm";

import { getDb } from "@/db";
import { chats, cases } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");

    // Build query conditions
    const conditions = [eq(chats.userId, user.id)];
    if (caseId) {
      conditions.push(eq(chats.caseId, caseId));
    }

    const userChats = await db
      .select({
        id: chats.id,
        title: chats.title,
        caseId: chats.caseId,
        caseName: cases.title,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
      })
      .from(chats)
      .leftJoin(cases, eq(chats.caseId, cases.id))
      .where(and(...conditions))
      .orderBy(desc(chats.updatedAt))
      .limit(50);

    return Response.json(userChats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = await getDb();
    const body = await request.json();
    const { id, title, caseId } = body;

    // Check if chat already exists (upsert behavior)
    if (id) {
      const existing = await db
        .select()
        .from(chats)
        .where(and(eq(chats.id, id), eq(chats.userId, user.id)))
        .limit(1);

      if (existing.length > 0) {
        // Update existing chat
        const [updated] = await db
          .update(chats)
          .set({ title: title || existing[0].title, updatedAt: new Date() })
          .where(eq(chats.id, id))
          .returning();
        return Response.json(updated);
      }
    }

    const [chat] = await db
      .insert(chats)
      .values({
        id: id || crypto.randomUUID(),
        userId: user.id,
        title: title || "New Chat",
        caseId: caseId || null,
      })
      .returning();

    return Response.json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("id");

    if (!chatId) {
      return new Response("Chat ID required", { status: 400 });
    }

    await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.userId, user.id)));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
