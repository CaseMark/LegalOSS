"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Square, Loader2, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const CASE_API_KEY = process.env.NEXT_PUBLIC_CASE_API_KEY || "";

export function LiveTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [duration, setDuration] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      setIsConnecting(true);

      // Get WebSocket URL from API
      const urlResponse = await fetch("/api/transcription/streaming-url");
      if (!urlResponse.ok) {
        throw new Error("Failed to get streaming URL");
      }

      const urlData = await urlResponse.json();
      console.log("[Live Transcription] Got WebSocket URL:", urlData.url);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect to Modal WebSocket endpoint
      const wsUrl = urlData.connect_url || urlData.url;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Live Transcription] WebSocket connected");
        setIsConnecting(false);
        setIsRecording(true);
        toast.success("Recording started");

        // Start duration counter
        durationIntervalRef.current = setInterval(() => {
          setDuration((d) => d + 1);
        }, 1000);
      };

      ws.onmessage = (event) => {
        try {
          console.log("[Live Transcription] Received message:", event.data);
          const data = JSON.parse(event.data);
          console.log("[Live Transcription] Parsed data:", data);

          if (data.error) {
            console.error("[Live Transcription] Error:", data.error);
            toast.error("Transcription error", {
              description: data.error,
            });
            return;
          }

          // Handle session start (Modal uses "Begin" type)
          if (data.type === "Begin" || data.type === "session_begins") {
            console.log("[Live Transcription] Session started:", data);
            toast.success("Connected - start speaking!");
            return;
          }

          // Handle transcript messages - Modal uses "Turn" type
          if (data.type === "Turn") {
            const currentTranscript = data.transcript || "";

            if (data.end_of_turn) {
              // Final transcript - add to permanent transcript
              console.log("[Live Transcription] Final turn:", currentTranscript);
              setTranscript((prev) => (prev + " " + currentTranscript).trim());
              setPartialTranscript("");
            } else {
              // Partial transcript - show as italic/gray
              console.log("[Live Transcription] Partial turn:", currentTranscript);
              setPartialTranscript(currentTranscript);
            }
          } else {
            console.log("[Live Transcription] Unknown message type:", data.type, "Full data:", data);
          }
        } catch (error) {
          console.error("[Live Transcription] Parse error:", error, "Raw data:", event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("[Live Transcription] WebSocket error:", error);
        toast.error("WebSocket connection failed", {
          description: "The streaming endpoint may not be fully deployed yet. Contact support@case.dev",
        });
        setIsConnecting(false);
        setIsRecording(false);
      };

      ws.onclose = (event) => {
        console.log("[Live Transcription] WebSocket closed:", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        setIsRecording(false);
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }

        if (!event.wasClean) {
          toast.error("Connection closed unexpectedly", {
            description: `Code: ${event.code}, Reason: ${event.reason || "Unknown"}`,
          });
        }
      };

      // Set up audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      let frameCount = 0;
      let totalAudioLevel = 0;

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);

          // Calculate audio level (RMS) to verify we're getting real audio
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          const audioLevel = Math.round(rms * 100);
          totalAudioLevel += audioLevel;

          // Convert Float32Array to Int16Array (PCM S16LE)
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          // Send to WebSocket
          ws.send(pcmData.buffer);

          // Log every 10 frames with audio level
          frameCount++;
          if (frameCount % 10 === 0) {
            const avgLevel = Math.round(totalAudioLevel / 10);
            console.log(
              `[Live Transcription] Sent ${frameCount} audio frames | ` +
                `Audio level: ${avgLevel}% ${avgLevel < 1 ? "⚠️  SILENCE!" : "✓ Has audio"}`,
            );
            totalAudioLevel = 0;
          }
        }
      };

      // Store media recorder for cleanup
      mediaRecorderRef.current = { stream, processor, source } as any;
    } catch (error) {
      console.error("[Live Transcription] Start error:", error);
      setIsConnecting(false);
      toast.error("Failed to start recording", {
        description: error instanceof Error ? error.message : "Please check microphone permissions",
      });
    }
  };

  const stopRecording = () => {
    // Send terminate message
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ terminate: true }));
      wsRef.current.close();
    }

    // Stop media recorder
    if (mediaRecorderRef.current) {
      const { stream, processor, source } = mediaRecorderRef.current as any;
      if (processor) processor.disconnect();
      if (source) source.disconnect();
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    }

    // Stop audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }

    // Stop duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    setIsRecording(false);
    toast.info("Recording stopped");
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-foreground">Live Transcription</CardTitle>
          <CardDescription className="text-muted-foreground">
            Real-time speech-to-text from your microphone
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {/* Big Record Button */}
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              className={`h-32 w-32 rounded-full transition-all ${
                isRecording ? "animate-pulse bg-red-500 hover:bg-red-600" : ""
              }`}
              variant={isRecording ? "destructive" : "default"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="size-12 animate-spin" />
              ) : isRecording ? (
                <Square className="size-12" />
              ) : (
                <Mic className="size-12" />
              )}
            </Button>

            {isRecording && (
              <div className="flex flex-col items-center gap-2">
                <Badge variant="destructive" className="px-4 py-1 text-sm">
                  <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-white" />
                  Recording
                </Badge>
                <p className="text-muted-foreground font-mono text-sm">{formatDuration(duration)}</p>
              </div>
            )}

            <p className="text-muted-foreground text-sm">
              {isRecording ? "Click to stop recording" : isConnecting ? "Connecting..." : "Click to start recording"}
            </p>
          </div>

          {/* Transcript Display */}
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground text-sm">Live Transcript</CardTitle>
                {transcript && (
                  <Button variant="outline" size="sm" onClick={downloadTranscript}>
                    <Download className="mr-2 size-3" />
                    Download
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="bg-muted/30 min-h-[280px] rounded-lg p-4">
                  {transcript || partialTranscript ? (
                    <div className="space-y-2">
                      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
                      {partialTranscript && (
                        <p className="text-muted-foreground text-sm leading-relaxed italic">{partialTranscript}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm italic">
                      Start recording to see transcription appear in real-time...
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Info */}
          <Alert>
            <AlertTitle className="text-foreground">How it works</AlertTitle>
            <AlertDescription className="text-muted-foreground space-y-2 text-xs">
              <div className="space-y-1">
                <p>• Click the microphone to start recording</p>
                <p>• Speak clearly into your microphone</p>
                <p>• Watch the transcript appear in real-time</p>
                <p>• Click stop when finished</p>
                <p>• Download the complete transcript</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
