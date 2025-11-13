import {
  FolderLock,
  MessageSquare,
  FileText,
  Mic,
  ScanText,
  FileSearch,
  Users,
  Lock,
  Fingerprint,
  SquareArrowUpRight,
  LayoutDashboard,
  Briefcase,
  Scale,
  FileStack,
  BookOpen,
  Volume2,
  Globe,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        title: "Case Management",
        url: "/dashboard/cases",
        icon: Briefcase,
      },
    ],
  },
  {
    id: 2,
    label: "Services",
    items: [
      {
        title: "Vaults",
        url: "/dashboard/vaults",
        icon: FolderLock,
      },
      {
        title: "AI Chat",
        url: "/dashboard/chat",
        icon: MessageSquare,
      },
      {
        title: "OCR",
        url: "/dashboard/ocr",
        icon: ScanText,
      },
      {
        title: "Transcription",
        url: "/dashboard/transcription",
        icon: Mic,
      },
      {
        title: "Text-to-Speech",
        url: "/dashboard/speak",
        icon: Volume2,
      },
      {
        title: "Knowledge Graphs",
        url: "/dashboard/knowledge-graphs",
        icon: Globe,
        comingSoon: true,
      },
      {
        title: "Clause Library",
        url: "/dashboard/clause-library",
        icon: FileStack,
        comingSoon: true,
      },
    ],
  },
  {
    id: 3,
    label: "Settings",
    items: [
      {
        title: "Team Members",
        url: "/dashboard/team",
        icon: Users,
      },
      {
        title: "Groups",
        url: "/dashboard/groups",
        icon: Users,
      },
      {
        title: "Permissions",
        url: "/dashboard/permissions",
        icon: Lock,
      },
    ],
  },
  {
    id: 4,
    label: "Resources",
    items: [
      {
        title: "Documentation",
        url: "https://docs.case.dev",
        icon: BookOpen,
        newTab: true,
      },
      {
        title: "API Reference",
        url: "https://docs.case.dev/api",
        icon: SquareArrowUpRight,
        newTab: true,
      },
    ],
  },
];
