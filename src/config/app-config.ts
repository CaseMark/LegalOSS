import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "LegalOSS",
  version: packageJson.version,
  copyright: `© ${currentYear}, Case.dev.`,
  meta: {
    title: "LegalOSS - Open Source Legal AI Platform",
    description:
      "LegalOSS is an open-source legal practice management platform with AI superpowers. Built with Next.js 16, Tailwind CSS v4, and shadcn/ui. Powered by Case.dev's AI services including Vaults, OCR, Transcription, Case Management, and more. Enterprise-ready with RBAC and multi-user support.",
  },
};
