import { useEffect, useState } from "react";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface VaultWithStats {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  objectCount: number;
  totalSize: string;
  totalSizeBytes: number;
  status: string;
}

export function useVaultsWithStats() {
  const { data: vaultsData, isLoading: vaultsLoading, mutate } = useSWR("/api/vaults", fetcher);
  const [vaults, setVaults] = useState<VaultWithStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  useEffect(() => {
    if (!vaultsData?.vaults) return;

    const loadStats = async () => {
      setIsLoadingStats(true);
      try {
        const vaultsWithStats = await Promise.all(
          vaultsData.vaults.map(async (v: any) => {
            try {
              const objectsResponse = await fetch(`/api/vaults/${v.id}/objects`);
              if (objectsResponse.ok) {
                const objectsData = await objectsResponse.json();
                const objects = objectsData.objects || [];
                const totalBytes = objects.reduce((sum: number, obj: any) => sum + (obj.size || 0), 0);

                return {
                  id: v.id,
                  name: v.name,
                  description: v.description || "",
                  createdAt: v.createdAt || v.created_at || new Date().toISOString(),
                  objectCount: objects.length,
                  totalSize: formatBytes(totalBytes),
                  totalSizeBytes: totalBytes,
                  status: "active",
                };
              }
            } catch (err) {
              console.warn(`Failed to load stats for vault ${v.id}:`, err);
            }

            // Fallback if stats fetch fails
            return {
              id: v.id,
              name: v.name,
              description: v.description || "",
              createdAt: v.createdAt || v.created_at || new Date().toISOString(),
              objectCount: 0,
              totalSize: "0 B",
              totalSizeBytes: 0,
              status: "active",
            };
          }),
        );

        setVaults(vaultsWithStats);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadStats();
  }, [vaultsData]);

  return {
    vaults,
    isLoading: vaultsLoading || isLoadingStats,
    mutate: () => {
      mutate();
      // Stats will reload via useEffect when vaultsData changes
    },
  };
}
