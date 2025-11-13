/**
 * Permission System - Following Open WebUI Pattern
 * Hierarchical, granular, enterprise-grade
 */

export interface Permissions {
  workspace: {
    models: boolean;
    knowledge: boolean;
    prompts: boolean;
    tools: boolean;
  };
  chat: {
    file_upload: boolean;
    delete: boolean;
    edit: boolean;
    temporary: boolean;
  };
  // Legal AI specific permissions
  vaults: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    upload: boolean;
    download: boolean;
    search: boolean;
  };
  ocr: {
    create: boolean;
    read: boolean;
    evaluate: boolean;
    download: boolean;
  };
  transcription: {
    create: boolean;
    read: boolean;
    streaming: boolean;
    download: boolean;
  };
  chat_ai: {
    use: boolean;
    change_model: boolean;
    change_settings: boolean;
  };
  tts: {
    use: boolean;
    download: boolean;
  };
}

/**
 * Default permissions for new users
 */
export const DEFAULT_USER_PERMISSIONS: Permissions = {
  workspace: {
    models: true,
    knowledge: true,
    prompts: true,
    tools: true,
  },
  chat: {
    file_upload: true,
    delete: true,
    edit: true,
    temporary: true,
  },
  vaults: {
    create: true,
    read: true,
    update: true,
    delete: true,
    upload: true,
    download: true,
    search: true,
  },
  ocr: {
    create: true,
    read: true,
    evaluate: true,
    download: true,
  },
  transcription: {
    create: true,
    read: true,
    streaming: true,
    download: true,
  },
  chat_ai: {
    use: true,
    change_model: true,
    change_settings: true,
  },
  tts: {
    use: true,
    download: true,
  },
};

/**
 * Admin permissions (everything enabled)
 */
export const ADMIN_PERMISSIONS: Permissions = {
  workspace: {
    models: true,
    knowledge: true,
    prompts: true,
    tools: true,
  },
  chat: {
    file_upload: true,
    delete: true,
    edit: true,
    temporary: true,
  },
  vaults: {
    create: true,
    read: true,
    update: true,
    delete: true,
    upload: true,
    download: true,
    search: true,
  },
  ocr: {
    create: true,
    read: true,
    evaluate: true,
    download: true,
  },
  transcription: {
    create: true,
    read: true,
    streaming: true,
    download: true,
  },
  chat_ai: {
    use: true,
    change_model: true,
    change_settings: true,
  },
  tts: {
    use: true,
    download: true,
  },
};

/**
 * Pending user permissions (nothing enabled)
 */
export const PENDING_PERMISSIONS: Permissions = {
  workspace: {
    models: false,
    knowledge: false,
    prompts: false,
    tools: false,
  },
  chat: {
    file_upload: false,
    delete: false,
    edit: false,
    temporary: false,
  },
  vaults: {
    create: false,
    read: false,
    update: false,
    delete: false,
    upload: false,
    download: false,
    search: false,
  },
  ocr: {
    create: false,
    read: false,
    evaluate: false,
    download: false,
  },
  transcription: {
    create: false,
    read: false,
    streaming: false,
    download: false,
  },
  chat_ai: {
    use: false,
    change_model: false,
    change_settings: false,
  },
  tts: {
    use: false,
    download: false,
  },
};

/**
 * Get permissions for a user based on role
 * Following Open WebUI's pattern
 */
export function getPermissions(role: string): Permissions {
  switch (role) {
    case "admin":
      return ADMIN_PERMISSIONS;
    case "user":
      return DEFAULT_USER_PERMISSIONS;
    case "pending":
      return PENDING_PERMISSIONS;
    default:
      return PENDING_PERMISSIONS;
  }
}

/**
 * Check if user has specific permission
 * Supports dot notation: "vaults.create", "ocr.evaluate", etc.
 */
export function hasPermission(userRole: string, permissionKey: string): boolean {
  const permissions = getPermissions(userRole);
  const keys = permissionKey.split(".");

  let current: any = permissions;
  for (const key of keys) {
    if (current[key] === undefined) {
      return false;
    }
    current = current[key];
  }

  return Boolean(current);
}

/**
 * Permission descriptions for UI
 */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "vaults.create": "Create new vaults",
  "vaults.read": "View vaults and files",
  "vaults.upload": "Upload files to vaults",
  "vaults.download": "Download files from vaults",
  "vaults.search": "Use semantic search",
  "ocr.create": "Submit OCR jobs",
  "ocr.read": "View OCR results",
  "ocr.evaluate": "Use visual evaluation tools",
  "transcription.create": "Submit transcription jobs",
  "transcription.streaming": "Use live transcription",
  "chat_ai.use": "Use AI chat",
  "chat_ai.change_model": "Select different AI models",
  "tts.use": "Generate text-to-speech",
};
