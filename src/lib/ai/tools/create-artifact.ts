import { tool } from "ai";
import { z } from "zod";

export const artifactKinds = ["text", "memo", "letter", "brief", "contract", "summary"] as const;

export type ArtifactKind = (typeof artifactKinds)[number];

/**
 * Create artifact tool for LegalOSS.
 * This tool signals the UI to open the artifact drawer and returns
 * the artifact specification. The actual content generation happens
 * in the main chat response after this tool returns.
 */
export const createArtifact = tool({
  description: `Create an artifact (document, memo, poem, etc.).

⚠️ CRITICAL: After this tool executes, your VERY NEXT CHARACTER must be the start of the actual content. 

FORBIDDEN after tool call:
- "I'll create..." 
- "Here's..."
- "Let me write..."
- ANY conversational text

CORRECT: [tool returns] → "# Title\n\nActual content starts here..."
WRONG: [tool returns] → "I'll create a poem for you.\n\n# Title..." ← THE "I'll create" PART IS FORBIDDEN

Say any commentary BEFORE calling this tool, not after.`,
  inputSchema: z.object({
    title: z.string().describe("The artifact title"),
    kind: z.enum(artifactKinds).describe("The type of artifact: text, memo, letter, brief, contract, or summary"),
  }),
  execute: async ({ title, kind }: { title: string; kind: ArtifactKind }) => {
    const id = crypto.randomUUID();

    return {
      id,
      title,
      kind,
      status: "created",
      message: `Artifact "${title}" created. Now write the full content using markdown formatting.`,
    };
  },
});
