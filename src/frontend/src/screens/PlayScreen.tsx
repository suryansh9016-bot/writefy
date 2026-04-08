import { ArrowLeft, BookOpen, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Theme } from "../lib/themes";
import type { Project, Screen } from "../lib/types";

interface PlayScreenProps {
  project: Project | null;
  onNavigate: (screen: Screen) => void;
  activeTheme?: Theme;
  onEditProject?: () => void;
}

function renderScreenplayContent(content: string): React.ReactNode[] {
  if (!content.trim()) return [];

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let keyIdx = 0;
  let lastWasCharacter = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={keyIdx++} style={{ height: "12px" }} />);
      lastWasCharacter = false;
      continue;
    }

    const isSlugline =
      /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/.test(trimmed) ||
      (trimmed === trimmed.toUpperCase() &&
        trimmed.length > 4 &&
        !/^["(]/.test(trimmed) &&
        /[A-Z]{3,}/.test(trimmed) &&
        trimmed.includes(" "));

    const isCharacterLine =
      !isSlugline &&
      trimmed === trimmed.toUpperCase() &&
      trimmed.length < 40 &&
      !trimmed.includes(".") &&
      /^[A-Z]/.test(trimmed) &&
      /[A-Z]{2,}/.test(trimmed);

    const isParenthetical = /^\(/.test(trimmed) && /\)/.test(trimmed);

    if (isSlugline) {
      lastWasCharacter = false;
      elements.push(
        <div
          key={keyIdx++}
          className="mt-8 mb-2"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#f5f5f5",
            fontSize: "15px",
          }}
        >
          {trimmed}
        </div>,
      );
    } else if (isCharacterLine) {
      lastWasCharacter = true;
      elements.push(
        <div
          key={keyIdx++}
          className="mt-6 mb-1 text-center"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            textTransform: "uppercase",
            color: "#9AA0A6",
            fontSize: "14px",
            letterSpacing: "0.05em",
          }}
        >
          {trimmed}
        </div>,
      );
    } else if (isParenthetical) {
      lastWasCharacter = false;
      elements.push(
        <div
          key={keyIdx++}
          className="text-center mb-1"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            color: "#6B7280",
            fontSize: "13px",
            paddingLeft: "25%",
            paddingRight: "25%",
          }}
        >
          {trimmed}
        </div>,
      );
    } else if (
      lastWasCharacter ||
      line.startsWith("  ") ||
      line.startsWith("\t")
    ) {
      lastWasCharacter = false;
      elements.push(
        <div
          key={keyIdx++}
          className="mb-2"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            color: "#d4d4d4",
            fontSize: "14px",
            paddingLeft: "25%",
            paddingRight: "25%",
            lineHeight: 1.65,
          }}
        >
          {trimmed}
        </div>,
      );
    } else {
      lastWasCharacter = false;
      elements.push(
        <div
          key={keyIdx++}
          className="mb-4"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            color: "#e0e0e0",
            fontSize: "14px",
            lineHeight: 1.7,
          }}
        >
          {line}
        </div>,
      );
    }
  }

  return elements;
}

export function PlayScreen({
  project,
  onNavigate,
  activeTheme,
  onEditProject,
}: PlayScreenProps) {
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const accentColor = activeTheme?.accent ?? "#22C55E";

  useEffect(() => {
    if (isAutoScrolling) {
      const speedMap: Record<number, number> = {
        1: 0.5,
        2: 1,
        3: 2,
        4: 3.5,
        5: 5,
      };
      const px = speedMap[scrollSpeed] ?? 1;
      scrollIntervalRef.current = setInterval(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const atBottom =
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - 5;
        if (atBottom) {
          setIsAutoScrolling(false);
          return;
        }
        container.scrollTop += px;
      }, 16);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isAutoScrolling, scrollSpeed]);

  const progress =
    project && project.content.length > 0
      ? Math.min(100, Math.floor((project.content.length / 5000) * 100))
      : 0;

  if (!project) {
    return (
      <div
        data-ocid="play.page"
        className="min-h-screen flex items-center justify-center pb-36 relative z-10 px-6"
      >
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: `${accentColor}14`,
              border: `1px solid ${accentColor}26`,
            }}
          >
            <BookOpen size={32} style={{ color: `${accentColor}99` }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Nothing to Read</h2>
          <p className="text-sm mb-6" style={{ color: "#9AA0A6" }}>
            Select a project from your Library to read it here.
          </p>
          <button
            type="button"
            data-ocid="play.library.button"
            onClick={() => onNavigate("library")}
            className="px-6 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-200"
            style={{
              background: accentColor,
              color: "#050505",
              boxShadow: `0 4px 16px ${accentColor}4d`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            Go to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-ocid="play.page" className="min-h-screen pb-36 relative z-10">
      {/* Progress bar */}
      <div
        className="fixed top-0 left-0 right-0 z-30 h-0.5"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${progress}%`, background: accentColor }}
        />
      </div>

      {/* Sticky header */}
      <div
        className="sticky top-0 z-20 px-4 py-4"
        style={{
          background: "rgba(0,0,0,0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-ocid="play.back.button"
            onClick={() => onNavigate("library")}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all cursor-pointer flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)", color: "#9AA0A6" }}
            aria-label="Back to Library"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {project.title}
            </p>
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {project.type}
            </p>
          </div>
          {/* Play/Pause auto-scroll button */}
          <button
            type="button"
            data-ocid="play.autoscroll.toggle"
            onClick={() => setIsAutoScrolling((prev) => !prev)}
            title={isAutoScrolling ? "Pause auto-scroll" : "Auto-scroll"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer transition-all flex-shrink-0"
            style={{
              background: isAutoScrolling
                ? `${accentColor}26`
                : "rgba(255,255,255,0.06)",
              border: `1px solid ${
                isAutoScrolling ? `${accentColor}66` : "rgba(255,255,255,0.1)"
              }`,
              color: isAutoScrolling ? accentColor : "#9AA0A6",
            }}
          >
            {isAutoScrolling ? <Pause size={14} /> : <Play size={14} />}
            <span style={{ fontSize: "11px", fontWeight: 600 }}>
              {isAutoScrolling ? "Pause" : "Play"}
            </span>
          </button>
          <div
            className="px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              background: `${accentColor}1a`,
              border: `1px solid ${accentColor}40`,
              color: accentColor,
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            READING MODE
          </div>
        </div>

        {/* Speed slider — shown when scrolling */}
        {isAutoScrolling && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingTop: "10px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "#6B7280",
                flexShrink: 0,
                minWidth: "36px",
              }}
            >
              Speed
            </span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(Number(e.target.value))}
              style={{ flex: 1, accentColor }}
            />
            <span
              style={{
                fontSize: "10px",
                color: accentColor,
                flexShrink: 0,
                minWidth: "12px",
                textAlign: "center",
              }}
            >
              {scrollSpeed}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable content area */}
      <div
        ref={scrollContainerRef}
        onDoubleClick={onEditProject}
        style={{
          overflowY: "auto",
          height: "calc(100vh - 120px)",
          paddingBottom: "calc(8vh + 32px)",
        }}
      >
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div
            className="text-center mb-12 pb-8"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <h1
              className="text-2xl font-bold mb-2"
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#f5f5f5",
              }}
            >
              {project.title}
            </h1>
            <p
              style={{
                color: "#6B7280",
                fontSize: "13px",
                fontFamily: "'Courier New', Courier, monospace",
              }}
            >
              {project.type} &middot; {project.wordCount.toLocaleString()} words
            </p>
            {onEditProject && (
              <p
                style={{
                  color: "#374151",
                  fontSize: "11px",
                  marginTop: "6px",
                  fontFamily: "'Courier New', Courier, monospace",
                }}
              >
                double-tap to edit
              </p>
            )}
          </div>

          {project.content.trim() ? (
            <div>{renderScreenplayContent(project.content)}</div>
          ) : (
            <div
              data-ocid="play.content.empty_state"
              className="text-center py-20"
            >
              <p
                style={{
                  color: "#4B5563",
                  fontFamily: "'Courier New', Courier, monospace",
                }}
              >
                [ This project has no content yet ]
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
