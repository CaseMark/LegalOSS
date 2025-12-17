import { redirect } from "next/navigation";

import { eq, desc } from "drizzle-orm";

import { getDb } from "@/db";
import { tabularAnalyses, cases } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";

import { TablesClient } from "./tables-client";

export default async function TablesPage() {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/v2/login");
  }

  const db = await getDb();

  // Get all analyses for this user
  const analyses = await db
    .select({
      id: tabularAnalyses.id,
      name: tabularAnalyses.name,
      status: tabularAnalyses.status,
      documentIds: tabularAnalyses.documentIds,
      columns: tabularAnalyses.columns,
      createdAt: tabularAnalyses.createdAt,
      caseId: tabularAnalyses.caseId,
      caseName: cases.title,
      vaultId: tabularAnalyses.vaultId,
    })
    .from(tabularAnalyses)
    .leftJoin(cases, eq(tabularAnalyses.caseId, cases.id))
    .where(eq(tabularAnalyses.userId, user.id))
    .orderBy(desc(tabularAnalyses.createdAt))
    .limit(50);

  // Transform to expected format
  const formattedAnalyses = analyses.map((a) => ({
    id: a.id,
    name: a.name,
    status: a.status,
    documentIds: JSON.parse(a.documentIds || "[]"),
    columns: JSON.parse(a.columns || "[]"),
    createdAt: a.createdAt,
    caseId: a.caseId,
    caseName: a.caseName,
    vaultId: a.vaultId,
  }));

  return <TablesClient analyses={formattedAnalyses} />;
}
