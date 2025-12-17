"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from "react";

/**
 * Strips AI preamble from artifact content.
 * Strategy: If content has a markdown header (#), start from the first #
 */
function sanitizeArtifactContent(content: string): string {
  if (!content) return content;

  // Find the first # that starts a markdown header
  // Pattern: # followed by space and text (not ## alone)
  const firstHeaderIndex = content.search(/#{1,6}\s+\S/);

  if (firstHeaderIndex > 0) {
    // There's content before the header - strip it
    return content.slice(firstHeaderIndex).trim();
  }

  // No header or header is at start - return as is
  return content.trim();
}

export interface Artifact {
  id: string;
  title: string;
  kind: "text" | "memo" | "letter" | "brief" | "contract" | "summary";
  content: string;
  isStreaming: boolean;
  chatId?: string;
  caseId?: string;
  version: number;
}

interface SearchReplace {
  search: string;
  replace: string;
}

// Callback for when user edits artifact (to notify LLM)
type UserEditCallback = (artifact: Artifact, oldVersion: number, newVersion: number) => void;

interface ArtifactContextValue {
  artifact: Artifact | null;
  isOpen: boolean;
  chatId: string | null;
  setChatId: (id: string) => void;
  openArtifact: (artifact: Omit<Artifact, "isStreaming" | "version">) => void;
  reopenArtifact: (id: string) => Promise<void>;
  closeArtifact: () => void;
  updateContent: (content: string, sanitize?: boolean) => void;
  appendContent: (delta: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  setTitle: (title: string) => void;
  getStoredArtifact: (id: string) => Artifact | undefined;
  saveArtifact: (artifactId?: string) => Promise<void>;
  applySearchReplace: (operations: SearchReplace[]) => void;
  incrementVersion: () => void;
  setOnUserEdit: (callback: UserEditCallback | null) => void;
  notifyUserEdit: () => void;
}

const ArtifactContext = createContext<ArtifactContextValue | null>(null);

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [chatId, setChatIdState] = useState<string | null>(null);

  // Store all artifacts by ID so we can reopen them
  const artifactsRef = useRef<Map<string, Artifact>>(new Map());

  // Refs to avoid stale closures in callbacks
  const chatIdRef = useRef(chatId);
  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  // Callback for notifying when user edits
  const onUserEditRef = useRef<UserEditCallback | null>(null);

  // Memoize setChatId to prevent infinite loops
  const setChatId = useCallback((id: string) => {
    setChatIdState(id);
  }, []);

  const openArtifact = useCallback((newArtifact: Omit<Artifact, "isStreaming" | "version">) => {
    const fullArtifact = { ...newArtifact, isStreaming: true, chatId: chatIdRef.current ?? undefined, version: 1 };
    setArtifact(fullArtifact);
    artifactsRef.current.set(newArtifact.id, fullArtifact);
    setIsOpen(true);
  }, []);

  const reopenArtifact = useCallback(async (id: string) => {
    // First check local cache
    const stored = artifactsRef.current.get(id);
    if (stored) {
      setArtifact({ ...stored, isStreaming: false });
      setIsOpen(true);
      return;
    }

    // Try to fetch from DB
    try {
      const response = await fetch(`/api/artifacts?id=${id}`);
      if (response.ok) {
        const dbArtifact = await response.json();
        const artifact: Artifact = {
          id: dbArtifact.id,
          title: dbArtifact.title,
          kind: dbArtifact.kind,
          content: dbArtifact.content ?? "",
          isStreaming: false,
          chatId: dbArtifact.chatId,
          caseId: dbArtifact.caseId,
          version: dbArtifact.version ?? 1,
        };
        artifactsRef.current.set(id, artifact);
        setArtifact(artifact);
        setIsOpen(true);
      }
    } catch (error) {
      console.error("[ArtifactContext] Failed to fetch artifact:", error);
    }
  }, []);

  const closeArtifact = useCallback(() => {
    setIsOpen(false);
  }, []);

  const updateContent = useCallback((content: string, sanitize = true) => {
    setArtifact((prev) => {
      if (!prev) return null;
      const finalContent = sanitize ? sanitizeArtifactContent(content) : content;
      const updated = { ...prev, content: finalContent };
      artifactsRef.current.set(prev.id, updated);
      return updated;
    });
  }, []);

  const appendContent = useCallback((delta: string) => {
    setArtifact((prev) => {
      if (!prev) return null;
      const updated = { ...prev, content: prev.content + delta };
      artifactsRef.current.set(prev.id, updated);
      return updated;
    });
  }, []);

  const setStreaming = useCallback((isStreaming: boolean) => {
    setArtifact((prev) => {
      if (!prev) return null;
      const updated = { ...prev, isStreaming };
      artifactsRef.current.set(prev.id, updated);
      return updated;
    });
  }, []);

  const setTitle = useCallback((title: string) => {
    setArtifact((prev) => {
      if (!prev) return null;
      const updated = { ...prev, title };
      artifactsRef.current.set(prev.id, updated);
      return updated;
    });
  }, []);

  const getStoredArtifact = useCallback((id: string) => {
    return artifactsRef.current.get(id);
  }, []);

  // Save artifact to database (uses artifactsRef to get latest content)
  const saveArtifact = useCallback(async (artifactId?: string) => {
    // Get the artifact from the ref map (has latest content)
    const id = artifactId;
    if (!id) return;

    const artifactToSave = artifactsRef.current.get(id);
    if (!artifactToSave) return;

    try {
      // Check if artifact exists in DB first
      const checkResponse = await fetch(`/api/artifacts?id=${artifactToSave.id}`);
      const method = checkResponse.ok ? "PUT" : "POST";

      await fetch("/api/artifacts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: artifactToSave.id,
          title: artifactToSave.title,
          content: artifactToSave.content,
          kind: artifactToSave.kind,
          chatId: artifactToSave.chatId ?? chatIdRef.current,
          caseId: artifactToSave.caseId,
        }),
      });
    } catch (error) {
      console.error("[ArtifactContext] Failed to save artifact:", error);
    }
  }, []);

  // Apply search/replace operations to artifact content (increments version)
  const applySearchReplace = useCallback((operations: SearchReplace[]) => {
    setArtifact((prev) => {
      if (!prev) return null;

      let newContent = prev.content;
      for (const op of operations) {
        newContent = newContent.replace(op.search, op.replace);
      }

      const updated = { ...prev, content: newContent, version: prev.version + 1 };
      artifactsRef.current.set(prev.id, updated);
      return updated;
    });
  }, []);

  // Increment version (for user saves)
  const incrementVersion = useCallback(() => {
    setArtifact((prev) => {
      if (!prev) return null;
      const updated = { ...prev, version: prev.version + 1 };
      artifactsRef.current.set(prev.id, updated);
      return updated;
    });
  }, []);

  // Set callback for user edits
  const setOnUserEdit = useCallback((callback: UserEditCallback | null) => {
    onUserEditRef.current = callback;
  }, []);

  // Notify that user made an edit (increments version, saves, and calls callback)
  const notifyUserEdit = useCallback(() => {
    if (!artifact) return;

    const oldVersion = artifact.version;
    const newVersion = oldVersion + 1;

    // Update state
    const updated = { ...artifact, version: newVersion };
    setArtifact(updated);
    artifactsRef.current.set(artifact.id, updated);

    // Save to DB
    saveArtifact(artifact.id);

    // Call the callback if set
    if (onUserEditRef.current) {
      onUserEditRef.current(updated, oldVersion, newVersion);
    }
  }, [artifact, saveArtifact]);

  const contextValue = useMemo(
    () => ({
      artifact,
      isOpen,
      chatId,
      setChatId,
      openArtifact,
      reopenArtifact,
      closeArtifact,
      updateContent,
      appendContent,
      setStreaming,
      setTitle,
      getStoredArtifact,
      saveArtifact,
      applySearchReplace,
      incrementVersion,
      setOnUserEdit,
      notifyUserEdit,
    }),
    [
      artifact,
      isOpen,
      chatId,
      setChatId,
      openArtifact,
      reopenArtifact,
      closeArtifact,
      updateContent,
      appendContent,
      setStreaming,
      setTitle,
      getStoredArtifact,
      saveArtifact,
      applySearchReplace,
      incrementVersion,
      setOnUserEdit,
      notifyUserEdit,
    ],
  );

  return <ArtifactContext.Provider value={contextValue}>{children}</ArtifactContext.Provider>;
}

export function useArtifact() {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error("useArtifact must be used within an ArtifactProvider");
  }
  return context;
}
