"use client";

import { memo } from "react";

import { FileText, Pencil } from "lucide-react";

import { ToolCallPill } from "./ui/tool-call-pill";

export function ArtifactCallPill({
  title,
  kind,
  isLoading,
  onClick,
}: {
  title?: string;
  kind?: string;
  isLoading?: boolean;
  onClick?: () => void;
}) {
  return (
    <ToolCallPill
      icon={FileText}
      title={isLoading ? "Creating artifact" : "Artifact created"}
      subtitle={title || "Untitled"}
      status={isLoading ? "loading" : "complete"}
      tooltipText={onClick ? "Click to view artifact" : `${kind || "text"} artifact`}
      onClick={onClick}
    />
  );
}

export const MemoArtifactCallPill = memo(ArtifactCallPill);

export function ArtifactUpdatePill({
  editCount,
  isLoading,
  onClick,
}: {
  editCount?: number;
  isLoading?: boolean;
  onClick?: () => void;
}) {
  const subtitle =
    editCount && editCount > 0 ? `${editCount} edit${editCount === 1 ? "" : "s"} applied` : "Content updated";

  return (
    <ToolCallPill
      icon={Pencil}
      title={isLoading ? "Updating artifact" : "Artifact updated"}
      subtitle={subtitle}
      status={isLoading ? "loading" : "complete"}
      tooltipText={onClick ? "Click to view artifact" : "Artifact was updated"}
      onClick={onClick}
    />
  );
}

export const MemoArtifactUpdatePill = memo(ArtifactUpdatePill);
