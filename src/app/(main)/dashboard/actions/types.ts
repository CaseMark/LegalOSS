export type ServiceType = "llm" | "ocr" | "vault" | "voice" | "workflows";

export interface ActionStep {
  id: string;
  service: ServiceType;
  description?: string;
  input: Record<string, any>;
  options?: Record<string, any>;
  action?: string; // For vault (upload/search)
  vault_id?: string; // For vault
  workflow_id?: string; // For workflows
}

export interface ActionDefinition {
  steps: ActionStep[];
}

export interface Action {
  id: string;
  name: string;
  description: string;
  definition: ActionDefinition;
  webhook_id?: string;
  created_at: string;
  updated_at: string;
}



