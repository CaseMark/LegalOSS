"use client";

import { Mic } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AsyncTranscription } from "./_components/async-transcription";
import { LiveTranscription } from "./_components/live-transcription";

export default function TranscriptionPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Transcription</h1>
          <p className="text-muted-foreground mt-1">
            Convert audio and video to accurate text with AI-powered speech recognition
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-6">
        <Tabs defaultValue="async" className="flex h-full flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="async">File Upload</TabsTrigger>
            <TabsTrigger value="streaming">Live Recording</TabsTrigger>
          </TabsList>

          <TabsContent value="async" className="mt-0 flex-1 overflow-auto">
            <AsyncTranscription />
          </TabsContent>

          <TabsContent value="streaming" className="mt-0 flex-1 overflow-auto">
            <LiveTranscription />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
