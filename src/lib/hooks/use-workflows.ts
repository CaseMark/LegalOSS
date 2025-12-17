import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  category?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
}

export function useWorkflows(query?: string) {
  const endpoint = query?.trim() ? `/api/workflows/search?q=${encodeURIComponent(query)}` : "/api/workflows";

  const { data, error, isLoading } = useSWR(endpoint, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  return {
    workflows: data?.workflows || [],
    isLoading,
    isError: error,
  };
}

export function useWorkflow(workflowId: string | null) {
  const { data, error, isLoading } = useSWR(workflowId ? `/api/workflows/${workflowId}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    workflow: data,
    isLoading,
    isError: error,
  };
}
