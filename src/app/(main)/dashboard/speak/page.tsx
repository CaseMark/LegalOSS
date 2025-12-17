"use client";

import { useState, useEffect, useRef } from "react";

import { Volume2, Play, Pause, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SpeakPage() {
  const [text, setText] = useState(
    "Welcome to Case.dev's text-to-speech service. This AI-powered voice synthesis can convert any text into natural-sounding audio for legal presentations, document narration, or accessibility features.",
  );
  const [selectedVoice, setSelectedVoice] = useState("EXAVITQu4vr4xnSDxMaL"); // Rachel
  const [stability, setStability] = useState([50]);
  const [similarityBoost, setSimilarityBoost] = useState([75]);
  const [style, setStyle] = useState([0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const { data: voicesData } = useSWR("/api/speak/voices", fetcher);
  const voices = voicesData?.voices || [];

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_id: selectedVoice,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: stability[0] / 100,
            similarity_boost: similarityBoost[0] / 100,
            style: style[0] / 100,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);

      // Clean up old URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(url);

      toast.success("Audio generated", {
        description: `${text.length} characters converted to speech`,
      });
    } catch (error) {
      toast.error("Failed to generate speech", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;

    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `speech-${Date.now()}.mp3`;
    a.click();
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const selectedVoiceInfo = voices.find((v: any) => v.voice_id === selectedVoice);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">Text-to-Speech</h1>
          <p className="text-muted-foreground mt-1">
            Convert text to natural-sounding speech with AI voices powered by ElevenLabs
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Text Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Text Input</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enter the text you want to convert to speech (up to 5,000 characters)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text here..."
                className="text-foreground min-h-[150px]"
                maxLength={5000}
              />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{text.length} / 5,000 characters</span>
                <Button onClick={handleGenerate} disabled={isGenerating || !text.trim()}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Volume2 className="mr-2 size-4" />
                      Generate Speech
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Voice Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Voice</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Select a voice for your text-to-speech
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="text-foreground">
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice: any) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          <div className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {voice.labels?.accent || voice.labels?.age || ""}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedVoiceInfo && (
                  <div className="bg-muted/30 space-y-1 rounded-lg border p-3">
                    <p className="text-foreground text-sm font-medium">{selectedVoiceInfo.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {selectedVoiceInfo.labels?.description ||
                        `${selectedVoiceInfo.labels?.accent || ""} ${selectedVoiceInfo.labels?.age || ""} ${selectedVoiceInfo.labels?.gender || ""}`.trim()}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedVoiceInfo.labels?.use_case && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedVoiceInfo.labels.use_case}
                        </Badge>
                      )}
                      {selectedVoiceInfo.category && (
                        <Badge variant="outline" className="text-xs">
                          {selectedVoiceInfo.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voice Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Voice Settings</CardTitle>
                <CardDescription className="text-muted-foreground">Fine-tune voice characteristics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">Stability</Label>
                    <span className="text-muted-foreground text-sm">{stability[0]}%</span>
                  </div>
                  <Slider value={stability} onValueChange={setStability} max={100} step={1} />
                  <p className="text-muted-foreground text-xs">
                    More stable = more consistent, less stable = more expressive
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">Clarity + Similarity</Label>
                    <span className="text-muted-foreground text-sm">{similarityBoost[0]}%</span>
                  </div>
                  <Slider value={similarityBoost} onValueChange={setSimilarityBoost} max={100} step={1} />
                  <p className="text-muted-foreground text-xs">Boost voice similarity and clarity</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">Style Exaggeration</Label>
                    <span className="text-muted-foreground text-sm">{style[0]}%</span>
                  </div>
                  <Slider value={style} onValueChange={setStyle} max={100} step={1} />
                  <p className="text-muted-foreground text-xs">0 = neutral, 100 = maximum style and emotion</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Audio Player */}
          {audioUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Generated Audio</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Play or download your generated speech
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="lg" onClick={togglePlay}>
                    {isPlaying ? (
                      <>
                        <Pause className="mr-2 size-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 size-4" />
                        Play
                      </>
                    )}
                  </Button>

                  <div className="flex-1">
                    <audio ref={audioRef} src={audioUrl} className="w-full" controls />
                  </div>

                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="mr-2 size-4" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">About Text-to-Speech</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-foreground mb-2 font-medium">Use Cases:</p>
                <ul className="text-muted-foreground list-inside list-disc space-y-1">
                  <li>Narrate legal documents for accessibility</li>
                  <li>Create audio versions of contracts or briefs</li>
                  <li>Generate voice-overs for presentations</li>
                  <li>Convert depositions or transcripts to audio</li>
                </ul>
              </div>

              <Separator />

              <div>
                <p className="text-foreground mb-2 font-medium">Features:</p>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-green-500">✓</span>
                    <span className="text-muted-foreground">100+ realistic voices</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-green-500">✓</span>
                    <span className="text-muted-foreground">29 languages supported</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-green-500">✓</span>
                    <span className="text-muted-foreground">Fine-tuned voice control</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-green-500">✓</span>
                    <span className="text-muted-foreground">Professional quality audio</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
