import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useVaults() {
  const { data, error, isLoading, mutate } = useSWR("/api/vaults", fetcher);

  return {
    vaults: data?.vaults || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useVault(vaultId: string | null) {
  const { data, error, isLoading } = useSWR(vaultId ? `/api/vaults/${vaultId}` : null, fetcher);

  return {
    vault: data,
    isLoading,
    isError: error,
  };
}

export function useVaultObjects(vaultId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(vaultId ? `/api/vaults/${vaultId}/objects` : null, fetcher);

  return {
    objects: data?.objects || [],
    isLoading,
    isError: error,
    mutate,
  };
}
