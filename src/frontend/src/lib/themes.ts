export interface Theme {
  id: string;
  name: string;
  accent: string;
  accentGlow: string;
  bgBase: string;
  bgGlow: string;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  isDay?: boolean;
}

export const THEMES: Theme[] = [
  {
    id: "green",
    name: "Forest",
    accent: "#22C55E",
    accentGlow: "rgba(34,197,94,0.13)",
    bgBase: "#000000",
    bgGlow: "rgba(0,255,120,0.13)",
    textPrimary: "#ffffff",
    textSecondary: "#9AA0A6",
    cardBg: "rgba(0,0,0,0.6)",
  },
  {
    id: "purple",
    name: "Violet",
    accent: "#A855F7",
    accentGlow: "rgba(168,85,247,0.13)",
    bgBase: "#000000",
    bgGlow: "rgba(160,80,255,0.13)",
    textPrimary: "#ffffff",
    textSecondary: "#9AA0A6",
    cardBg: "rgba(0,0,0,0.6)",
  },
  {
    id: "blue",
    name: "Ocean",
    accent: "#3B82F6",
    accentGlow: "rgba(59,130,246,0.13)",
    bgBase: "#000000",
    bgGlow: "rgba(60,120,255,0.13)",
    textPrimary: "#ffffff",
    textSecondary: "#9AA0A6",
    cardBg: "rgba(0,0,0,0.6)",
  },
  {
    id: "cyan",
    name: "Arctic",
    accent: "#06B6D4",
    accentGlow: "rgba(6,182,212,0.13)",
    bgBase: "#000000",
    bgGlow: "rgba(0,200,220,0.13)",
    textPrimary: "#ffffff",
    textSecondary: "#9AA0A6",
    cardBg: "rgba(0,0,0,0.6)",
  },
  {
    id: "amber",
    name: "Amber",
    accent: "#F59E0B",
    accentGlow: "rgba(245,158,11,0.13)",
    bgBase: "#000000",
    bgGlow: "rgba(250,160,0,0.13)",
    textPrimary: "#ffffff",
    textSecondary: "#9AA0A6",
    cardBg: "rgba(0,0,0,0.6)",
  },
  {
    id: "red",
    name: "Crimson",
    accent: "#EF4444",
    accentGlow: "rgba(239,68,68,0.13)",
    bgBase: "#000000",
    bgGlow: "rgba(240,60,60,0.13)",
    textPrimary: "#ffffff",
    textSecondary: "#9AA0A6",
    cardBg: "rgba(0,0,0,0.6)",
  },
  {
    id: "day",
    name: "Day",
    accent: "#2d2d2d",
    accentGlow: "rgba(0,0,0,0.05)",
    bgBase: "#f5f0e8",
    bgGlow: "transparent",
    textPrimary: "#1a1a1a",
    textSecondary: "#555555",
    cardBg: "rgba(255,255,255,0.7)",
    isDay: true,
  },
];

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-glow", theme.accentGlow);
  root.style.setProperty("--bg-base", theme.bgBase);
  root.style.setProperty("--bg-glow", theme.bgGlow);
  root.style.setProperty("--text-primary", theme.textPrimary);
  root.style.setProperty("--text-secondary", theme.textSecondary);
  root.style.setProperty("--card-bg", theme.cardBg);
  document.body.style.background = theme.bgBase;
  if (theme.isDay) {
    document.body.setAttribute("data-theme", "day");
  } else {
    document.body.removeAttribute("data-theme");
  }
  localStorage.setItem("writefy-theme", theme.id);
}
