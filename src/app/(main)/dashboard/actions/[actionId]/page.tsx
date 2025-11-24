import { ActionsBuilder } from "../_components/actions-builder";

interface PageProps {
  params: {
    actionId: string;
  };
}

// In a real app, we would fetch the action data here or pass the ID to the builder to fetch
export default function EditActionPage({ params }: PageProps) {
  return <ActionsBuilder actionId={params.actionId} />;
}



