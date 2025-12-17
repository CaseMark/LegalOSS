import { tool } from "ai";
import { z } from "zod";

/**
 * Update artifact tool for LegalOSS.
 * Makes targeted edits to an existing artifact using search/replace.
 */
export const updateArtifact = tool({
  description: `Update an existing artifact by replacing specific content. Use this when the user asks you to edit, modify, or update an existing artifact.

You have two options:
1. Use 'searchReplace' to find and replace specific text (preferred for targeted edits)
2. Use 'fullContent' to replace the entire artifact content (use for major rewrites)

IMPORTANT: Only use this tool when there is an existing artifact to update. If no artifact exists, use create_artifact first.`,
  inputSchema: z.object({
    artifactId: z.string().describe("The ID of the artifact to update"),
    searchReplace: z
      .array(
        z.object({
          search: z.string().describe("The exact text to find in the artifact"),
          replace: z.string().describe("The text to replace it with"),
        }),
      )
      .optional()
      .describe("Array of search/replace operations for targeted edits"),
    fullContent: z
      .string()
      .optional()
      .describe("Complete new content to replace the entire artifact (use for major rewrites)"),
    title: z.string().optional().describe("New title for the artifact (optional)"),
  }),
  execute: async ({
    artifactId,
    searchReplace,
    fullContent,
    title,
  }: {
    artifactId: string;
    searchReplace?: Array<{ search: string; replace: string }>;
    fullContent?: string;
    title?: string;
  }) => {
    // Return the update instructions - the actual update happens client-side
    return {
      artifactId,
      searchReplace: searchReplace || [],
      fullContent,
      title,
      status: "update_requested",
      message: searchReplace?.length
        ? `Applied ${searchReplace.length} edit(s) to the artifact.`
        : "Artifact content updated.",
    };
  },
});
