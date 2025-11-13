"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Dynamically import PDF.js only on client-side
let pdfjsLib: any = null;

if (typeof window !== "undefined") {
  import("pdfjs-dist").then((module) => {
    pdfjsLib = module;
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";
  });
}

interface OCRWord {
  value: string;
  confidence: number;
  geometry: [[number, number], [number, number]];
}

interface OCRLine {
  geometry: [[number, number], [number, number]];
  words: OCRWord[];
}

interface OCRBlock {
  geometry: [[number, number], [number, number]];
  lines: OCRLine[];
}

interface OCRPageData {
  page_index: number;
  dimensions: [number, number];
  blocks: OCRBlock[];
}

interface OCRData {
  pages: OCRPageData[];
  text?: string;
}

interface OCREvaluationProps {
  jobId: string;
  onBack: () => void;
}

export function OCREvaluation({ jobId, onBack }: OCREvaluationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showWords, setShowWords] = useState(true);
  const [showLines, setShowLines] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState([100]);
  const [pageConfidence, setPageConfidence] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [ocrData, setOcrData] = useState<OCRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF and OCR data
  useEffect(() => {
    // Wait for pdfjsLib to be loaded
    if (pdfjsLib) {
      loadPDFAndData();
    } else {
      const checkInterval = setInterval(() => {
        if (pdfjsLib) {
          clearInterval(checkInterval);
          loadPDFAndData();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, [jobId]);

  // Redraw when controls change
  useEffect(() => {
    if (pdfDoc && ocrData) {
      drawBoundingBoxes();
    }
  }, [showWords, showLines, confidenceThreshold, pdfDoc, ocrData]);

  const loadPDFAndData = async () => {
    if (!pdfjsLib) {
      console.log("PDF.js not loaded yet, waiting...");
      return;
    }

    try {
      setLoading(true);

      // Load OCR JSON data
      const jsonResponse = await fetch(`/api/ocr/${jobId}/download/json`);
      if (!jsonResponse.ok) throw new Error("Failed to load OCR data");
      const data: OCRData = await jsonResponse.json();
      setOcrData(data);

      // Load PDF
      const pdfResponse = await fetch(`/api/ocr/${jobId}/download/original`);
      if (!pdfResponse.ok) throw new Error("Failed to load PDF");
      const pdfBlob = await pdfResponse.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(err instanceof Error ? err.message : "Failed to load OCR evaluation data");
      setLoading(false);
    }
  };

  const renderPage = async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any existing render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    const page = await pdfDoc.getPage(pageNumber);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = canvasRef.current;
    if (!canvas) return; // Safety check - canvas might be unmounted

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Store render task so we can cancel it if needed
    renderTaskRef.current = page.render({
      canvasContext: context,
      viewport: viewport,
    });

    try {
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;
      setCurrentPage(pageNumber);

      // Draw bounding boxes after render
      setTimeout(() => drawBoundingBoxes(pageNumber), 10);
    } catch (err: any) {
      if (err.name === "RenderingCancelledException") {
        // Render was cancelled, ignore
        console.log("Render cancelled for page", pageNumber);
      } else {
        throw err;
      }
    }
  };

  const drawBoundingBoxes = (pageNumber?: number) => {
    if (!overlayRef.current || !canvasRef.current || !ocrData?.pages) return;

    const canvas = canvasRef.current;
    if (canvas.offsetWidth === 0) return;

    const overlayContainer = overlayRef.current;
    overlayContainer.innerHTML = "";

    const targetPage = pageNumber ?? currentPage;
    const pageData = ocrData.pages[targetPage - 1];
    if (!pageData) return;

    let totalConfidence = 0;
    let wordCount = 0;

    pageData.blocks.forEach((block) => {
      block.lines.forEach((line) => {
        if (showLines) {
          const lineBox = createBoundingBox(line.geometry, "line", "", 1);
          overlayContainer.appendChild(lineBox);
        }

        line.words.forEach((word) => {
          totalConfidence += word.confidence;
          wordCount++;

          if (showWords && word.confidence * 100 <= confidenceThreshold[0]) {
            const wordBox = createBoundingBox(word.geometry, "word", word.value, word.confidence);
            overlayContainer.appendChild(wordBox);
          }
        });
      });
    });

    const avgConfidence = wordCount > 0 ? (totalConfidence / wordCount) * 100 : 0;
    setPageConfidence(avgConfidence);
  };

  const createBoundingBox = (
    geometry: [[number, number], [number, number]],
    type: "word" | "line",
    text: string,
    confidence: number,
  ) => {
    const box = document.createElement("div");

    if (!canvasRef.current) return box;

    const canvas = canvasRef.current;
    const topLeft = geometry[0];
    const bottomRight = geometry[1];

    const displayedWidth = canvas.offsetWidth;
    const displayedHeight = canvas.offsetHeight;

    const left = topLeft[0] * displayedWidth;
    const top = topLeft[1] * displayedHeight;
    const width = (bottomRight[0] - topLeft[0]) * displayedWidth;
    const height = (bottomRight[1] - topLeft[1]) * displayedHeight;

    box.style.position = "absolute";
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
    box.style.border = "2px solid";
    box.style.pointerEvents = "auto";
    box.style.cursor = "pointer";
    box.style.zIndex = "10";
    box.style.transition = "all 0.2s";

    if (type === "line") {
      box.style.borderColor = "rgba(147, 51, 234, 0.6)"; // Purple
      box.style.backgroundColor = "rgba(147, 51, 234, 0.1)";
    } else {
      const colors = getConfidenceColor(confidence);
      box.style.borderColor = colors.border;
      box.style.backgroundColor = colors.background;
    }

    // Hover effects
    box.addEventListener("mouseenter", () => {
      box.style.transform = "scale(1.05)";
      box.style.zIndex = "20";
      if (text) {
        box.title = `"${text}" - ${(confidence * 100).toFixed(1)}% confidence`;
      }
    });

    box.addEventListener("mouseleave", () => {
      box.style.transform = "scale(1)";
      box.style.zIndex = "10";
    });

    return box;
  };

  const getConfidenceColor = (confidence: number) => {
    const highConf = 0.95;
    const lowConf = 0.7;

    if (confidence >= highConf) {
      return {
        border: "rgba(34, 197, 94, 0.6)", // Green
        background: "rgba(34, 197, 94, 0.1)",
      };
    } else if (confidence <= lowConf) {
      return {
        border: "rgba(239, 68, 68, 0.6)", // Red
        background: "rgba(239, 68, 68, 0.1)",
      };
    } else {
      return {
        border: "rgba(251, 191, 36, 0.6)", // Yellow
        background: "rgba(251, 191, 36, 0.1)",
      };
    }
  };

  const handlePageChange = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
      renderPage(newPage);
    }
  };

  useEffect(() => {
    if (pdfDoc && canvasRef.current) {
      renderPage(currentPage);
    }
  }, [pdfDoc]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading OCR evaluation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="text-foreground text-2xl font-bold">OCR Evaluation</h2>
          <p className="text-muted-foreground text-sm">Visual confidence analysis</p>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Controls Sidebar */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Page Confidence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Page Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-4xl font-bold ${
                  pageConfidence >= 95 ? "text-green-600" : pageConfidence >= 70 ? "text-yellow-600" : "text-red-600"
                }`}
              >
                {pageConfidence.toFixed(1)}%
              </div>
              <p className="text-muted-foreground mt-1 text-xs">Average confidence for this page</p>
            </CardContent>
          </Card>

          {/* Layer Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Visualization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-words"
                  checked={showWords}
                  onCheckedChange={(checked) => setShowWords(checked as boolean)}
                />
                <Label htmlFor="show-words" className="text-foreground cursor-pointer">
                  Show Words
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-lines"
                  checked={showLines}
                  onCheckedChange={(checked) => setShowLines(checked as boolean)}
                />
                <Label htmlFor="show-lines" className="text-foreground cursor-pointer">
                  Show Lines
                </Label>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-sm">Max Confidence: {confidenceThreshold[0]}%</Label>
                <Slider
                  value={confidenceThreshold}
                  onValueChange={setConfidenceThreshold}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-muted-foreground text-xs">Show words with confidence below threshold</p>
              </div>

              {/* Color Legend */}
              <div className="space-y-2 border-t pt-4">
                <p className="text-foreground text-xs font-medium">Color Legend:</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border-2 border-green-500 bg-green-500/10" />
                    <span className="text-muted-foreground text-xs">High (≥95%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border-2 border-yellow-500 bg-yellow-500/10" />
                    <span className="text-muted-foreground text-xs">Medium (70-95%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border-2 border-red-500 bg-red-500/10" />
                    <span className="text-muted-foreground text-xs">Low (&lt;70%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border-2 border-purple-500 bg-purple-500/10" />
                    <span className="text-muted-foreground text-xs">Lines</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Page Navigation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(-1)} disabled={currentPage <= 1}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-foreground text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1">
          <Card>
            <CardContent className="p-6">
              <div className="relative inline-block">
                <canvas ref={canvasRef} className="block h-auto max-w-full border shadow-sm" />
                <div
                  ref={overlayRef}
                  className="pointer-events-none absolute top-0 left-0 h-full w-full"
                  style={{ pointerEvents: "none" }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
