import { Clock, FileText, Play, Plus, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { formatRelativeTime } from "../lib/storage";
import type { Project, Screen } from "../lib/types";

interface HomeScreenProps {
  projects: Project[];
  onNavigate: (screen: Screen) => void;
  onOpenProject: (project: Project) => void;
  onNewProject: () => void;
  onDeleteProject: (project: Project) => void;
}

const LONG_PRESS_MS = 500;

export function HomeScreen({
  projects,
  onNavigate,
  onOpenProject,
  onNewProject,
  onDeleteProject,
}: HomeScreenProps) {
  const [longPressMenu, setLongPressMenu] = useState<{
    project: Project;
    x: number;
    y: number;
  } | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTarget = useRef<Project | null>(null);
  const didLongPress = useRef(false);

  const handlePressStart = useCallback(
    (project: Project, e: React.MouseEvent | React.TouchEvent) => {
      didLongPress.current = false;
      longPressTarget.current = project;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true;
        setLongPressMenu({ project, x: clientX, y: clientY });
      }, LONG_PRESS_MS);
    },
    [],
  );

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleCardClick = useCallback(
    (project: Project) => {
      if (didLongPress.current) return; // long press already handled
      onOpenProject(project);
    },
    [onOpenProject],
  );

  const mostRecent =
    projects.length > 0
      ? [...projects].sort((a, b) => b.lastEdited - a.lastEdited)[0]
      : null;

  const recentProjects = projects
    .filter((p) => p.id !== mostRecent?.id)
    .sort((a, b) => b.lastEdited - a.lastEdited)
    .slice(0, 8);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const getProgressPercent = (project: Project) => {
    const target = project.type === "Novel" ? 60000 : 15000;
    return Math.min(100, Math.round((project.wordCount / target) * 100));
  };

  return (
    <div data-ocid="home.page" className="min-h-screen relative z-10">
      {/* Long-press context menu backdrop */}
      {longPressMenu && (
        <>
          <div
            role="button"
            tabIndex={-1}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 150,
              background: "rgba(0,0,0,0.5)",
            }}
            onClick={() => setLongPressMenu(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setLongPressMenu(null);
            }}
          />
          <div
            data-ocid="home.long_press_menu"
            style={{
              position: "fixed",
              top: Math.min(longPressMenu.y, window.innerHeight - 120),
              left: Math.min(longPressMenu.x, window.innerWidth - 200),
              zIndex: 151,
              background: "#111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
              minWidth: "180px",
            }}
          >
            <div
              style={{
                padding: "10px 14px 6px",
                fontSize: "11px",
                color: "#6B7280",
                fontWeight: 600,
                letterSpacing: "0.04em",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {longPressMenu.project.title}
            </div>
            <button
              type="button"
              data-ocid="home.long_press_delete.button"
              className="w-full cursor-pointer transition-colors"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 14px",
                background: "transparent",
                border: "none",
                color: "#ef4444",
                fontSize: "14px",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              onClick={() => {
                setLongPressMenu(null);
                onDeleteProject(longPressMenu.project);
              }}
            >
              <Trash2 size={15} style={{ flexShrink: 0 }} />
              Delete Project
            </button>
          </div>
        </>
      )}

      <div
        style={{
          paddingBottom: "calc(8vh + 32px)",
          paddingLeft: "16px",
          paddingRight: "16px",
          display: "flex",
          flexDirection: "column",
          margin: "0 auto",
          maxWidth: "640px",
        }}
      >
        {/* Header — 24px below the header's Writefy text */}
        <header style={{ paddingTop: "24px", paddingBottom: "12px" }}>
          <p
            style={{ color: "#9AA0A6", fontSize: "13px", marginBottom: "4px" }}
          >
            {greeting}
          </p>
          <h2
            className="font-bold text-white"
            style={{
              fontSize: "28px",
              fontWeight: 700,
              margin: "0 0 0 0",
              letterSpacing: "-0.02em",
            }}
          >
            Home
          </h2>
        </header>

        {/* Continue Writing Card */}
        <section data-ocid="home.continue.section" className="mb-4">
          {mostRecent ? (
            <div
              data-ocid="home.continue.card"
              className="rounded-2xl transition-all duration-300"
              style={{
                background: "rgba(26,26,26,0.7)",
                border: "1px solid rgba(0,255,120,0.2)",
                boxShadow:
                  "0 0 20px rgba(0,255,120,0.12), 0 2px 8px rgba(0,0,0,0.5)",
                padding: "14px",
                borderRadius: "16px",
              }}
              onMouseDown={(e) => handlePressStart(mostRecent, e)}
              onTouchStart={(e) => handlePressStart(mostRecent, e)}
              onMouseUp={handlePressEnd}
              onTouchEnd={handlePressEnd}
              onMouseLeave={handlePressEnd}
            >
              {/* Type badge */}
              <p
                className="font-bold uppercase mb-2"
                style={{
                  fontSize: "0.75rem",
                  color: "#22C55E",
                  letterSpacing: "0.15em",
                }}
              >
                {mostRecent.type}
              </p>

              {/* Project title */}
              <h3
                className="font-bold text-white leading-tight mb-1"
                style={{ fontSize: "1.4rem", letterSpacing: "-0.02em" }}
              >
                {mostRecent.title}
              </h3>

              {/* Last edited */}
              <div
                className="flex items-center gap-1 mb-3"
                style={{ color: "#9AA0A6", fontSize: "0.85rem" }}
              >
                <Clock size={12} />
                <span>
                  Last edited {formatRelativeTime(mostRecent.lastEdited)}
                </span>
              </div>

              {/* Progress bar */}
              {(() => {
                const pct = getProgressPercent(mostRecent);
                return (
                  <div className="mb-2">
                    <div
                      className="w-full rounded-full overflow-hidden"
                      style={{
                        height: "5px",
                        background: "rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background:
                            "linear-gradient(90deg, #22C55E, #16a34a)",
                          boxShadow: "0 0 6px rgba(34,197,94,0.5)",
                        }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Word / scene counts */}
              <div
                className="flex items-center justify-between mb-4"
                style={{ color: "#9AA0A6", fontSize: "0.75rem" }}
              >
                <span>
                  Words: {mostRecent.wordCount.toLocaleString()} /{" "}
                  {(mostRecent.type === "Novel"
                    ? 60000
                    : 15000
                  ).toLocaleString()}
                </span>
                <span>
                  Scenes: {mostRecent.sceneCount} /{" "}
                  {mostRecent.type === "Novel" ? 30 : 45}
                </span>
              </div>

              {/* Resume button */}
              <button
                type="button"
                data-ocid="home.resume.primary_button"
                onClick={() => handleCardClick(mostRecent)}
                className="w-full flex items-center justify-center gap-2 font-bold transition-all duration-200 cursor-pointer"
                style={{
                  background: "#22C55E",
                  color: "#050505",
                  borderRadius: "10px",
                  padding: "0.75rem",
                  fontSize: "0.9rem",
                  boxShadow:
                    "0 0 14px rgba(34,197,94,0.4), 0 2px 8px rgba(34,197,94,0.2)",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#16a34a";
                  e.currentTarget.style.boxShadow =
                    "0 0 20px rgba(34,197,94,0.6), 0 2px 10px rgba(34,197,94,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#22C55E";
                  e.currentTarget.style.boxShadow =
                    "0 0 14px rgba(34,197,94,0.4), 0 2px 8px rgba(34,197,94,0.2)";
                }}
              >
                <Play size={14} fill="#050505" />
                Resume
              </button>
            </div>
          ) : (
            <div
              className="rounded-2xl p-5 text-center"
              style={{
                background: "rgba(26,26,26,0.7)",
                border: "1px solid rgba(0,255,120,0.15)",
                boxShadow: "0 0 14px rgba(0,255,120,0.08)",
              }}
            >
              <p style={{ color: "#9AA0A6" }}>
                No projects yet. Start writing something!
              </p>
            </div>
          )}
        </section>

        {/* Recent Projects horizontal scroll */}
        {recentProjects.length > 0 && (
          <section
            data-ocid="home.recent.section"
            style={{ marginBottom: "18px" }}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: "12px" }}
            >
              <h2
                className="text-lg font-bold text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                Recent Projects
              </h2>
              <button
                type="button"
                data-ocid="home.library.link"
                onClick={() => onNavigate("library")}
                className="text-sm font-medium cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: "#22C55E" }}
              >
                See all
              </button>
            </div>

            <div
              className="flex overflow-x-auto pb-2 scrollbar-hide"
              style={{ gap: "12px" }}
            >
              {recentProjects.map((project, idx) => (
                <button
                  type="button"
                  key={project.id}
                  data-ocid={`home.recent.item.${idx + 1}`}
                  className="flex-shrink-0 w-36 rounded-xl p-3 cursor-pointer transition-all duration-200 text-left"
                  style={{
                    background: "rgba(20,20,20,0.85)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onClick={() => handleCardClick(project)}
                  onMouseDown={(e) => handlePressStart(project, e)}
                  onTouchStart={(e) => handlePressStart(project, e)}
                  onMouseUp={handlePressEnd}
                  onTouchEnd={handlePressEnd}
                  onMouseLeave={(e) => {
                    handlePressEnd();
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.07)";
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)";
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-full h-12 rounded-lg mb-2 flex items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(0,0,0,0.4) 100%)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <FileText
                      size={18}
                      style={{ color: "rgba(34,197,94,0.4)" }}
                    />
                  </div>
                  <div
                    className="inline-block px-1.5 py-0.5 rounded mb-1"
                    style={{
                      background: "rgba(34,197,94,0.1)",
                      color: "#22C55E",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {project.type.toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold text-white leading-tight line-clamp-2 mb-1">
                    {project.title}
                  </p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    {project.wordCount.toLocaleString()} words
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Start something new dashed card */}
        <section data-ocid="home.new.section">
          <button
            type="button"
            data-ocid="home.new.open_modal_button"
            onClick={onNewProject}
            className="w-full rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
            style={{
              border: "1.5px dashed rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.01)",
              padding: "20px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
              e.currentTarget.style.background = "rgba(34,197,94,0.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              e.currentTarget.style.background = "rgba(255,255,255,0.01)";
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              <Plus size={20} style={{ color: "#22C55E" }} />
            </div>
            <span className="text-sm font-medium" style={{ color: "#9AA0A6" }}>
              + Start something new
            </span>
          </button>
        </section>

        <footer className="text-center py-4" style={{ marginTop: "24px" }}>
          <p className="text-xs" style={{ color: "#374151" }}>
            &copy; {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              style={{ color: "#22C55E" }}
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
