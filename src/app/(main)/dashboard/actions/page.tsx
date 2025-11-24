"use client";

import { AppHeader } from "@/app/(main)/dashboard/_components/header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTable } from "@/components/data-table/data-table";
import { columns } from "./_components/columns";
import { Action } from "./types";

// Mock Data based on the websearch examples
const MOCK_ACTIONS: Action[] = [
  {
    id: "act_dep_summary",
    name: "Deposition Summary Action",
    description: "Process deposition transcript end-to-end",
    definition: {
      steps: [
        {
          id: "summarize",
          service: "workflows",
          workflow_id: "deposition_summary_workflow",
          input: { text: "{{input.transcript}}" },
          options: { model: "anthropic/claude-sonnet-4.5", max_tokens: 3000 },
        },
        {
          id: "extract_timeline",
          service: "llm",
          input: {
            text: "From this summary, extract a timeline of events as JSON: {{steps.summarize.output.text}}",
          },
          options: { model: "anthropic/claude-sonnet-4.5", max_tokens: 1000 },
        },
        {
          id: "store_summary",
          service: "vault",
          action: "upload",
          vault_id: "case_vault_123",
          input: {
            filename: "deposition_summary.json",
            content: "{{steps.summarize.output}}",
            metadata: {
              case_id: "{{input.case_id}}",
              document_type: "deposition_summary",
              processed_at: "{{timestamp}}",
            },
          },
        },
      ],
    },
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-01-15T10:00:00Z",
  },
  {
    id: "act_contract_analysis",
    name: "Contract Analysis",
    description: "OCR contract, analyze clauses, identify risks",
    definition: {
      steps: [
        {
          id: "ocr",
          service: "ocr",
          input: { document_url: "{{input.contract_url}}" },
        },
        {
          id: "extract_clauses",
          service: "llm",
          input: {
            text: "Extract all indemnification clauses from this contract as JSON: {{steps.ocr.output.text}}",
          },
          options: {
            model: "openai/gpt-5",
            max_tokens: 2000,
            temperature: 0,
          },
        },
        {
          id: "risk_analysis",
          service: "llm",
          input: {
            text: "Analyze these clauses for risks: {{steps.extract_clauses.output.content}}",
          },
          options: {
            model: "anthropic/claude-opus-4.1",
            max_tokens: 1500,
          },
        },
      ],
    },
    created_at: "2025-01-14T15:30:00Z",
    updated_at: "2025-01-14T15:30:00Z",
  },
  {
    id: "act_meeting_transcribe",
    name: "Audio Transcription Pipeline",
    description: "Transcribe audio, summarize, extract action items",
    webhook_id: "webhook_notifications",
    definition: {
      steps: [
        {
          id: "transcribe",
          service: "voice",
          input: { audio_url: "{{input.audio_url}}" },
        },
        {
          id: "summarize",
          service: "llm",
          input: {
            text: "Summarize this meeting transcript: {{steps.transcribe.output.text}}",
          },
          options: { max_tokens: 1000 },
        },
        {
          id: "action_items",
          service: "llm",
          input: {
            text: "Extract action items as JSON from: {{steps.transcribe.output.text}}",
          },
          options: { max_tokens: 500 },
        },
      ],
    },
    created_at: "2025-01-12T09:15:00Z",
    updated_at: "2025-01-12T09:15:00Z",
  },
];

export default function ActionsPage() {
  const table = useDataTableInstance({
    columns,
    data: MOCK_ACTIONS,
  });

  return (
    <>
      <AppHeader
        title="Actions"
        description="Orchestrate multi-step legal processes with Actions."
      >
        <Button asChild>
          <Link href="/dashboard/actions/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Action
          </Link>
        </Button>
      </AppHeader>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DataTable table={table} columns={columns} />
      </div>
    </>
  );
}
