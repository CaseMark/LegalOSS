import { eq, and, asc } from "drizzle-orm";

import { getDb } from "@/db";
import { chats, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = await getDb();
    const { id: chatId } = await params;

    // Verify user owns this chat
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, user.id)))
      .limit(1);

    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }

    // Get messages for this chat
    const chatMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt));

    // Convert to UIMessage format
    const uiMessages = chatMessages.map((msg) => {
      let parsedContent: any = {};
      try {
        parsedContent = typeof msg.content === "string" ? JSON.parse(msg.content) : msg.content;
      } catch {
        parsedContent = { text: msg.content };
      }

      const parts = parsedContent?.parts || parsedContent || [];

      return {
        id: msg.id,
        role: msg.role,
        content: parsedContent?.text || (typeof msg.content === "string" ? msg.content : ""),
        parts: Array.isArray(parts) ? parts : [],
        createdAt: msg.createdAt,
      };
    });

    return Response.json(uiMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const db = await getDb();
    const { id: chatId } = await params;
    const body = await request.json();
    const { id: messageId, role, content } = body;

    if (!messageId || !role || content === undefined) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Verify user owns this chat
    const [chat] = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), eq(chats.userId, user.id)))
      .limit(1);

    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }

    // Check if message already exists (upsert behavior)
    const existing = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);

    if (existing.length > 0) {
      // Update existing message
      const [updated] = await db
        .update(messages)
        .set({ content: typeof content === "string" ? content : JSON.stringify(content) })
        .where(eq(messages.id, messageId))
        .returning();

      // Update chat's updatedAt
      await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, chatId));

      return Response.json(updated);
    }

    // Insert new message
    const [message] = await db
      .insert(messages)
      .values({
        id: messageId,
        chatId,
        role,
        content: typeof content === "string" ? content : JSON.stringify(content),
      })
      .returning();

    // Update chat's updatedAt
    await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, chatId));

    return Response.json(message);
  } catch (error) {
    console.error("Error saving message:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
