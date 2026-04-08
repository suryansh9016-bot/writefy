import { BookOpen, Home, PenLine, Play } from "lucide-react";
import type { Screen } from "../lib/types";

interface BottomNavProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onCreateClick?: () => void;
}

const TABS: {
  id: Screen;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
}[] = [
  { id: "home", icon: Home, label: "Home" },
  { id: "library", icon: BookOpen, label: "Library" },
  { id: "create", icon: PenLine, label: "Create" },
  { id: "play", icon: Play, label: "Play" },
];

export function BottomNav({
  activeScreen,
  onNavigate,
  onCreateClick,
}: BottomNavProps) {
  return (
    <nav
      data-ocid="bottom_nav"
      className="fixed bottom-0 left-0 z-50 w-full"
      aria-label="Main navigation"
      style={{
        height: "8vh",
        minHeight: "56px",
        background: "#0d0d0d",
        borderTop: "2px solid #005500",
      }}
    >
      <div className="flex items-center justify-around w-full h-full px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeScreen === tab.id;
          const handleClick = () => {
            if (tab.id === "create" && onCreateClick) {
              onCreateClick();
            } else {
              onNavigate(tab.id);
            }
          };
          return (
            <button
              type="button"
              key={tab.id}
              data-ocid={`nav.${tab.id}.tab`}
              onClick={handleClick}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-all duration-200 cursor-pointer flex-1"
              style={{
                color: isActive ? "#22C55E" : "#6B7280",
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span
                className="font-medium leading-none"
                style={{ fontSize: "11px", letterSpacing: "0.02em" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
