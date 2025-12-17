"use client";

import { useState } from "react";

import { Plus, FileText, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DocumentsTabProps {
  caseId: string;
  documents: any[];
  onUpdate: () => void;
}

export function DocumentsTab({ caseId, documents, onUpdate }: DocumentsTabProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedVault, setSelectedVault] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");

  const { data: vaultsData } = useSWR("/api/vaults", fetcher);
  const vaults = vaultsData?.vaults || [];

  const { data: objectsData } = useSWR(selectedVault ? `/api/vaults/${selectedVault}/objects` : null, fetcher);
  const vaultObjects = objectsData?.objects || [];

  const getDocumentTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      pleading: "default",
      discovery: "secondary",
      evidence: "outline",
      correspondence: "outline",
    };

    return (
      <Badge variant={variants[type] || "outline"} className="capitalize">
        {type}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-foreground text-lg font-medium">Case Documents</h3>
          <p className="text-muted-foreground text-sm">Files from vaults linked to this case</p>
        </div>
        <Button onClick={() => setShowLinkDialog(true)}>
          <LinkIcon className="mr-2 size-4" />
          Link Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="text-muted-foreground mb-4 size-12" />
            <h3 className="text-foreground text-lg font-medium">No documents linked</h3>
            <p className="text-muted-foreground mb-4 max-w-md text-center text-sm">
              Link files from your vaults to organize case documents
            </p>
            <Button onClick={() => setShowLinkDialog(true)}>
              <LinkIcon className="mr-2 size-4" />
              Link First Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="text-muted-foreground mt-0.5 size-5" />
                    <div className="space-y-1">
                      <p className="text-foreground font-medium">{doc.description || "Document"}</p>
                      {doc.documentType && getDocumentTypeBadge(doc.documentType)}
                      {doc.filedDate && (
                        <p className="text-muted-foreground text-xs">
                          Filed: {new Date(doc.filedDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View in Vault
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Link Document Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Link Document to Case</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Connect a file from your vaults to this case
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Select Vault</Label>
              <Select value={selectedVault} onValueChange={setSelectedVault}>
                <SelectTrigger className="text-foreground">
                  <SelectValue placeholder="Choose a vault" />
                </SelectTrigger>
                <SelectContent>
                  {vaults.map((vault: any) => (
                    <SelectItem key={vault.id} value={vault.id}>
                      {vault.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVault && (
              <div className="space-y-2">
                <Label className="text-foreground">Select Document</Label>
                <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue placeholder="Choose a document" />
                  </SelectTrigger>
                  <SelectContent>
                    {vaultObjects.map((obj: any) => (
                      <SelectItem key={obj.id} value={obj.id}>
                        {obj.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button disabled={!selectedDocument}>Link Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
