import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { contacts } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/contacts - Create contact
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { type, firstName, lastName, entityName, email, phone, address, barNumber, specialization, notes } = body;

    if (!type) {
      return NextResponse.json({ error: "Contact type is required" }, { status: 400 });
    }

    const contactId = uuidv4();

    const db = await getDb();
    await db.insert(contacts).values({
      id: contactId,
      userId: user.id,
      type,
      firstName: firstName || null,
      lastName: lastName || null,
      entityName: entityName || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      barNumber: barNumber || null,
      specialization: specialization || null,
      notes: notes || null,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, contactId }, { status: 201 });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Contacts] Create error:", error);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
