import type { UIMessage } from "ai";

export interface MessageRenderContext {
  chatId: string;
  isLoading: boolean;
  isArtifactVisible: boolean;
}

export interface ToolPartRendererProps {
  part: UIMessage["parts"][number];
  context: MessageRenderContext;
}
