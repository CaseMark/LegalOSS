import {
  Mic,
  ScanText,
  Users,
  Lock,
  SquareArrowUpRight,
  LayoutDashboard,
  Briefcase,
  BookOpen,
  Volume2,
  EyeOff,
  Vault,
  Box,
  ScrollText,
  Search,
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
        icon: Vault,
      },
      {
        title: "AI Agents",
        url: "/dashboard/playground",
        icon: Box,
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
        title: "Formatter",
        url: "/dashboard/formatter",
        icon: ScrollText,
      },
      {
        title: "Web Search",
        url: "/dashboard/search",
        icon: Search,
        isNew: true,
      },
      {
        title: "Redactor",
        url: "/dashboard/redactor",
        icon: EyeOff,
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
