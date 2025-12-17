import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

import { ResearchClient } from "./research-client";

export default async function ResearchPage() {
  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/v2/login");
  }

  return <ResearchClient />;
}
