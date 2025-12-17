import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface VaultObject {
  id: string;
  name: string;
  type: string;
  size: number;
  ingestionStatus: string;
  createdAt: string;
  vaultId: string;
}

export function useVaultObjectsMulti(vaultIds: string[]) {
  const vaultIdsKey = vaultIds.sort().join(",");

  const { data, error, isLoading } = useSWR(
    vaultIds.length > 0 ? `/api/vaults/objects-multi?vaultIds=${encodeURIComponent(vaultIdsKey)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  );

  return {
    objects: data?.objects || [],
    isLoading,
    isError: error,
  };
}
