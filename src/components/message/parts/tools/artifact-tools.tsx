"use client";

import { ArtifactCallPill, ArtifactUpdatePill } from "@/components/artifact-pill";
import { useArtifact } from "@/lib/artifacts/context";

import type { ToolPartRendererProps } from "../../types";

function CreateArtifactPart({ part }: { part: any }) {
  const { reopenArtifact, getStoredArtifact } = useArtifact();

  const { toolCallId, state } = part;
  const input = part.input;
  const output = part.output;
  const isLoading = state === "input-available" || state === "input-streaming";
  const title = output?.title || input?.title || "Artifact";
  const kind = output?.kind || input?.kind || "text";
  const artifactId = output?.id;

  const handleClick = () => {
    if (artifactId && !isLoading) {
      const stored = getStoredArtifact(artifactId);
      if (stored) {
        reopenArtifact(artifactId);
      } else {
        // Try to load from DB
        reopenArtifact(artifactId);
      }
    }
  };

  return (
    <div key={toolCallId} className="w-full min-w-0">
      <ArtifactCallPill
        title={title}
        kind={kind}
        isLoading={isLoading}
        onClick={!isLoading && artifactId ? handleClick : undefined}
      />
    </div>
  );
}

function UpdateArtifactPart({ part }: { part: any }) {
  const { reopenArtifact } = useArtifact();

  const { toolCallId, state } = part;
  const output = part.output;
  const isLoading = state === "input-available" || state === "input-streaming";
  const artifactId = output?.artifactId;
  const editCount = output?.searchReplace?.length || 0;

  const handleClick = () => {
    if (artifactId && !isLoading) {
      reopenArtifact(artifactId);
    }
  };

  return (
    <div key={toolCallId} className="w-full min-w-0">
      <ArtifactUpdatePill
        editCount={editCount}
        isLoading={isLoading}
        onClick={!isLoading && artifactId ? handleClick : undefined}
      />
    </div>
  );
}

export const renderArtifactTool = ({ part }: ToolPartRendererProps) => {
  if (!part || typeof part !== "object") return null;

  const { type } = part as any;

  switch (type) {
    case "tool-create_artifact": {
      return <CreateArtifactPart key={(part as any).toolCallId} part={part} />;
    }

    case "tool-update_artifact": {
      return <UpdateArtifactPart key={(part as any).toolCallId} part={part} />;
    }

    default:
      return null;
  }
};
