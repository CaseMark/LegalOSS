import { z } from "zod";

const CASE_API_URL = process.env.CASE_API_URL || "https://api.case.dev";
const CASE_API_KEY = process.env.CASE_API_KEY;

interface VaultFilesystemToolOptions {
  selectedVaults: string[];
}

type ToolDefinition = {
  description: string;
  parameters: z.ZodTypeAny;
  execute: (...args: any[]) => Promise<any>;
};

const createTool = (definition: ToolDefinition) => definition;

export function vaultFilesystemTools({ selectedVaults }: VaultFilesystemToolOptions) {
  const listVaultFiles = createTool({
    description: `List all files in a vault with their indexing status. Shows which files are uploaded, indexed for search, and processed with GraphRAG. Use this to discover what documents are available before searching. If user doesn't specify which vault, list files from ALL available vaults.`,
    parameters: z.object({
      vaultId: z
        .string()
        .optional()
        .describe("The vault ID to list files from. If not provided, will list files from all available vaults."),
    }),
    execute: async ({ vaultId }) => {
      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

      // If no vaultId provided, use all selected vaults
      const vaultsToQuery = vaultId ? [vaultId] : selectedVaults;

      if (vaultsToQuery.length === 0) {
        return {
          error: "No vaults available. Please select vaults from the sidebar.",
          totalFiles: 0,
          files: [],
        };
      }

      const allFiles: any[] = [];
      let totalSearchable = 0;

      for (const vId of vaultsToQuery) {
        try {
          const response = await fetch(`${CASE_API_URL}/vault/${vId}/objects`, {
            headers: {
              Authorization: `Bearer ${CASE_API_KEY}`,
            },
          });

          if (!response.ok) {
            console.error(`Failed to list files for vault ${vId}`);
            continue;
          }

          const data = await response.json();
          const objects = data.objects || [];

          for (const obj of objects) {
            const file = {
              vaultId: vId,
              filename: obj.filename,
              objectId: obj.id,
              status: obj.ingestionStatus || "pending",
              isSearchable: obj.chunkCount > 0,
              chunkCount: obj.chunkCount,
              vectorCount: obj.vectorCount,
              pageCount: obj.pageCount,
              textLength: obj.textLength,
              uploadedAt: obj.createdAt,
            };
            allFiles.push(file);
            if (file.isSearchable) totalSearchable++;
          }
        } catch (error) {
          console.error(`Error fetching vault ${vId}:`, error);
        }
      }

      return {
        vaultsQueried: vaultsToQuery,
        totalFiles: allFiles.length,
        files: allFiles,
        searchableFiles: totalSearchable,
      };
    },
  });

  const getVaultFileInfo = createTool({
    description: `Get detailed information about a specific file in a vault including its indexing status, size, and metadata.`,
    parameters: z.object({
      vaultId: z.string().describe("The vault ID"),
      objectId: z.string().describe("The object/file ID to get info about"),
    }),
    execute: async ({ vaultId, objectId }) => {
      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

      // Get vault objects and find the specific one
      const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects`, {
        headers: {
          Authorization: `Bearer ${CASE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get file info: ${response.statusText}`);
      }

      const data = await response.json();
      const object = data.objects?.find((o: any) => o.id === objectId);

      if (!object) {
        return {
          error: `File not found: ${objectId}`,
        };
      }

      return {
        filename: object.filename,
        objectId: object.id,
        status: object.ingestionStatus,
        isSearchable: object.chunkCount > 0,
        indexingDetails: {
          chunkCount: object.chunkCount,
          vectorCount: object.vectorCount,
          pageCount: object.pageCount,
          textLength: object.textLength,
        },
        uploadedAt: object.createdAt,
        processedAt: object.ingestionCompletedAt,
        contentType: object.contentType,
      };
    },
  });

  const organizeVaultsByContent = createTool({
    description: `Analyze and categorize files across all available vaults based on their content. Useful for understanding what types of documents you have access to.`,
    parameters: z.object({}),
    execute: async () => {
      if (!CASE_API_KEY) throw new Error("CASE_API_KEY not configured");

      const categories: Record<string, string[]> = {
        "Depositions & Transcripts": [],
        "Medical Records": [],
        "Legal Documents": [],
        Other: [],
      };

      for (const vaultId of selectedVaults) {
        try {
          const response = await fetch(`${CASE_API_URL}/vault/${vaultId}/objects`, {
            headers: { Authorization: `Bearer ${CASE_API_KEY}` },
          });

          if (!response.ok) continue;

          const data = await response.json();
          const objects = data.objects || [];

          for (const obj of objects) {
            const filename = obj.filename?.toLowerCase() || "";

            if (filename.includes("depos") || filename.includes("transcript")) {
              categories["Depositions & Transcripts"].push(`${obj.filename} (${vaultId})`);
            } else if (filename.includes("medical") || filename.includes("health")) {
              categories["Medical Records"].push(`${obj.filename} (${vaultId})`);
            } else if (filename.includes("brief") || filename.includes("contract") || filename.includes("pleading")) {
              categories["Legal Documents"].push(`${obj.filename} (${vaultId})`);
            } else {
              categories["Other"].push(`${obj.filename} (${vaultId})`);
            }
          }
        } catch (error) {
          console.error(`Failed to analyze vault ${vaultId}:`, error);
        }
      }

      return {
        vaultsAnalyzed: selectedVaults.length,
        categories,
        totalFiles: Object.values(categories).reduce((sum, files) => sum + files.length, 0),
      };
    },
  });

  return {
    tools: {
      listVaultFiles,
      getVaultFileInfo,
      organizeVaultsByContent,
    },
    activeToolNames: ["listVaultFiles", "getVaultFileInfo", "organizeVaultsByContent"],
  };
}
