import {
  WebSearchResult,
  WebSearchCallPill,
  LegalFindResult,
  LegalFindCallPill,
  LegalVerifyResult,
  LegalVerifyCallPill,
  DocSearchResult,
  DocSearchCallPill,
} from "@/components/search-result";

import type { ToolPartRendererProps } from "../../types";

export const renderSearchTool = ({ part, context }: ToolPartRendererProps) => {
  if (!part || typeof part !== "object") return null;

  const { type } = part as any;
  const { isArtifactVisible } = context;

  switch (type) {
    // Web Search
    case "tool-web_search": {
      const { toolCallId, state } = part as any;
      if (state === "input-available" || state === "input-streaming") {
        const input = (part as any).input;
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <WebSearchCallPill query={input?.query} />
          </div>
        );
      }
      if (state === "output-available") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <WebSearchResult result={(part as any).output} isArtifactVisible={isArtifactVisible} />
          </div>
        );
      }
      return null;
    }

    // Legal Find
    case "tool-legal_find": {
      const { toolCallId, state } = part as any;
      if (state === "input-available" || state === "input-streaming") {
        const input = (part as any).input;
        const query = input?.citation || input?.keywords || input?.partyNames?.join(" v. ");
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <LegalFindCallPill query={query} />
          </div>
        );
      }
      if (state === "output-available") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <LegalFindResult result={(part as any).output} isArtifactVisible={isArtifactVisible} />
          </div>
        );
      }
      return null;
    }

    // Legal Verify
    case "tool-legal_verify": {
      const { toolCallId, state } = part as any;
      if (state === "input-available" || state === "input-streaming") {
        const input = (part as any).input;
        const claim = input?.target?.citation || input?.candidate?.title;
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <LegalVerifyCallPill claim={claim} />
          </div>
        );
      }
      if (state === "output-available") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <LegalVerifyResult result={(part as any).output} />
          </div>
        );
      }
      return null;
    }

    // Document Search
    case "tool-doc_search": {
      const { toolCallId, state } = part as any;
      const input = (part as any).input;
      const output = (part as any).output;

      // Debug logging
      if (process.env.NODE_ENV !== "production") {
        console.debug("[search-tools] doc_search", {
          toolCallId,
          state,
          query: input?.query || output?.query,
        });
      }

      if (state === "input-available" || state === "input-streaming") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <DocSearchCallPill query={input?.query} />
          </div>
        );
      }
      if (state === "output-available") {
        return (
          <div key={toolCallId} className="w-full min-w-0">
            <DocSearchResult result={output} isArtifactVisible={isArtifactVisible} />
          </div>
        );
      }
      return null;
    }

    default:
      return null;
  }
};
