import {
  Clock,
  FileText,
  FolderOpen,
  Hash,
  LayoutGrid,
  List,
  Trash2,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { formatRelativeTime } from "../lib/storage";
import type { Project, Series } from "../lib/types";

interface LibraryScreenProps {
  projects: Project[];
  series: Series[];
  onOpenProject: (project: Project) => void;
  onOpenSeries: (series: Series) => void;
  onDeleteProject: (project: Project) => void;
}

type ViewMode = "grid" | "list";
type FilterMode = "all" | "Screenplay" | "Novel" | "Series";

const LONG_PRESS_MS = 500;

export function LibraryScreen({
  projects,
  series,
  onOpenProject,
  onOpenSeries,
  onDeleteProject,
}: LibraryScreenProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilter, setShowFilter] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [longPressMenu, setLongPressMenu] = useState<{
    project: Project;
    x: number;
    y: number;
  } | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handlePressStart = useCallback(
    (project: Project, e: React.MouseEvent | React.TouchEvent) => {
      didLongPress.current = false;
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

  const handleProjectClick = useCallback(
    (project: Project) => {
      if (didLongPress.current) return;
      onOpenProject(project);
    },
    [onOpenProject],
  );

  const sortedProjects = [...projects].sort(
    (a, b) => b.lastEdited - a.lastEdited,
  );
  const sortedSeries = [...series].sort((a, b) => b.lastEdited - a.lastEdited);

  const totalCount = projects.length + series.length;

  type LibraryItem =
    | { kind: "project"; data: Project }
    | { kind: "series"; data: Series };

  const allItems: LibraryItem[] = [
    ...sortedProjects.map((p) => ({ kind: "project" as const, data: p })),
    ...sortedSeries.map((s) => ({ kind: "series" as const, data: s })),
  ];

  const filtered = allItems.filter((item) => {
    if (filter === "all") return true;
    if (filter === "Series") return item.kind === "series";
    if (filter === "Screenplay" || filter === "Novel") {
      return item.kind === "project" && item.data.type === filter;
    }
    return true;
  });

  return (
    <div
      data-ocid="library.page"
      className="min-h-screen relative z-10"
      style={{ paddingBottom: "calc(8vh + 28px)" }}
    >
      {/* Long-press context menu */}
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
            data-ocid="library.long_press_menu"
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
              data-ocid="library.long_press_delete.button"
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

      {/* Header */}
      <div style={{ padding: "24px 16px 12px 16px" }}>
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-4xl font-bold text-white mb-1"
              style={{ letterSpacing: "-0.03em" }}
            >
              Library
            </h1>
            <p className="text-sm" style={{ color: "#9AA0A6" }}>
              {totalCount} {totalCount === 1 ? "item" : "items"}
            </p>
          </div>
          <div
            className="flex items-center gap-1 p-1 rounded-xl mt-2"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <button
              type="button"
              data-ocid="library.grid.toggle"
              onClick={() => {
                setViewMode("grid");
                setShowFilter((v) => !v);
              }}
              className="p-2 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                background:
                  viewMode === "grid" ? "rgba(34,197,94,0.15)" : "transparent",
                color: viewMode === "grid" ? "#22C55E" : "#6B7280",
              }}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              data-ocid="library.list.toggle"
              onClick={() => {
                setViewMode("list");
                setShowFilter(false);
              }}
              className="p-2 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                background:
                  viewMode === "list" ? "rgba(34,197,94,0.15)" : "transparent",
                color: viewMode === "list" ? "#22C55E" : "#6B7280",
              }}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: showFilter ? "48px" : "0px",
            transition: "max-height 0.25s ease",
            marginTop: showFilter ? "10px" : "0",
          }}
        >
          <div style={{ display: "flex", gap: "8px", paddingBottom: "4px" }}>
            {(["all", "Screenplay", "Novel", "Series"] as FilterMode[]).map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  data-ocid={`library.filter.${f.toLowerCase()}.tab`}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    background:
                      filter === f
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      filter === f
                        ? "1px solid rgba(34,197,94,0.45)"
                        : "1px solid rgba(255,255,255,0.08)",
                    color: filter === f ? "#22C55E" : "#9AA0A6",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f === "all" ? "All" : f}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      <div style={{ paddingLeft: "16px", paddingRight: "16px" }}>
        {filtered.length === 0 ? (
          <div
            data-ocid="library.empty_state"
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.15)",
              }}
            >
              <FileText size={28} style={{ color: "rgba(34,197,94,0.5)" }} />
            </div>
            <p className="text-white font-semibold mb-1">No items yet</p>
            <p className="text-sm" style={{ color: "#9AA0A6" }}>
              Start writing something amazing
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div
            className="grid grid-cols-2"
            style={{ gap: "14px", paddingBottom: "12px" }}
          >
            {filtered.map((item, idx) =>
              item.kind === "project" ? (
                <button
                  type="button"
                  key={item.data.id}
                  data-ocid={`library.item.${idx + 1}`}
                  className="rounded-2xl p-3 cursor-pointer transition-all duration-200 text-left"
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onClick={() => handleProjectClick(item.data)}
                  onMouseDown={(e) => handlePressStart(item.data, e)}
                  onTouchStart={(e) => handlePressStart(item.data, e)}
                  onMouseUp={handlePressEnd}
                  onTouchEnd={handlePressEnd}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    handlePressEnd();
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.07)";
                  }}
                >
                  <div
                    className="w-full rounded-xl mb-2 flex items-center justify-center"
                    style={{
                      aspectRatio: "4/3",
                      background:
                        "linear-gradient(135deg, rgba(34,197,94,0.07) 0%, rgba(0,0,0,0.5) 100%)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <FileText
                      size={26}
                      style={{ color: "rgba(34,197,94,0.35)" }}
                    />
                  </div>
                  <div
                    className="inline-block px-1.5 py-0.5 rounded mb-1"
                    style={{
                      background: "rgba(34,197,94,0.1)",
                      color: "#22C55E",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {item.data.type.toUpperCase()}
                  </div>
                  <p className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1.5">
                    {item.data.title}
                  </p>
                  <div
                    className="flex items-center text-xs"
                    style={{ color: "#6B7280", gap: "4px", flexWrap: "nowrap" }}
                  >
                    <Hash size={9} style={{ flexShrink: 0 }} />
                    <span style={{ flexShrink: 0 }}>
                      {item.data.wordCount.toLocaleString()}w
                    </span>
                    <span style={{ flexShrink: 0 }}>&middot;</span>
                    <span style={{ flexShrink: 0 }}>
                      {item.data.sceneCount}sc
                    </span>
                    <span style={{ flexShrink: 0 }}>&middot;</span>
                    <Clock size={9} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatRelativeTime(item.data.lastEdited)}
                    </span>
                  </div>
                </button>
              ) : (
                // Series card
                <button
                  type="button"
                  key={item.data.id}
                  data-ocid={`library.item.${idx + 1}`}
                  className="rounded-2xl p-3 cursor-pointer transition-all duration-200 text-left"
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onClick={() => onOpenSeries(item.data)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.07)";
                  }}
                >
                  <div
                    className="w-full rounded-xl mb-2 flex items-center justify-center"
                    style={{
                      aspectRatio: "4/3",
                      background:
                        "linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(0,0,0,0.5) 100%)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <FolderOpen
                      size={26}
                      style={{ color: "rgba(34,197,94,0.5)" }}
                    />
                  </div>
                  <div
                    className="inline-block px-1.5 py-0.5 rounded mb-1"
                    style={{
                      background: "rgba(34,197,94,0.15)",
                      color: "#22C55E",
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                  >
                    SERIES
                  </div>
                  <p className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1.5">
                    {item.data.title}
                  </p>
                  <div
                    className="flex items-center text-xs"
                    style={{ color: "#6B7280", gap: "4px", flexWrap: "nowrap" }}
                  >
                    <FolderOpen size={9} style={{ flexShrink: 0 }} />
                    <span style={{ flexShrink: 0 }}>
                      {item.data.itemCount} items
                    </span>
                    <span style={{ flexShrink: 0 }}>&middot;</span>
                    <Clock size={9} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatRelativeTime(item.data.lastEdited)}
                    </span>
                  </div>
                </button>
              ),
            )}
          </div>
        ) : (
          // List view
          <div className="space-y-2" style={{ paddingBottom: "12px" }}>
            {filtered.map((item, idx) =>
              item.kind === "project" ? (
                <button
                  type="button"
                  key={item.data.id}
                  data-ocid={`library.item.${idx + 1}`}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 w-full text-left"
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onClick={() => handleProjectClick(item.data)}
                  onMouseDown={(e) => handlePressStart(item.data, e)}
                  onTouchStart={(e) => handlePressStart(item.data, e)}
                  onMouseUp={handlePressEnd}
                  onTouchEnd={handlePressEnd}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(34,197,94,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    handlePressEnd();
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.06)";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(34,197,94,0.08)",
                      border: "1px solid rgba(34,197,94,0.15)",
                    }}
                  >
                    <FileText size={16} style={{ color: "#22C55E" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-white truncate">
                        {item.data.title}
                      </p>
                      <span
                        className="flex-shrink-0 px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(34,197,94,0.1)",
                          color: "#22C55E",
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        }}
                      >
                        {item.data.type.toUpperCase()}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: "#6B7280" }}
                    >
                      <Hash size={9} />
                      <span>{item.data.wordCount.toLocaleString()} words</span>
                      <span>&middot;</span>
                      <span>{item.data.sceneCount} scenes</span>
                      <span>&middot;</span>
                      <Clock size={9} />
                      <span>{formatRelativeTime(item.data.lastEdited)}</span>
                    </div>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  key={item.data.id}
                  data-ocid={`library.item.${idx + 1}`}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 w-full text-left"
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onClick={() => onOpenSeries(item.data)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(34,197,94,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.06)";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.2)",
                    }}
                  >
                    <FolderOpen size={16} style={{ color: "#22C55E" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-white truncate">
                        {item.data.title}
                      </p>
                      <span
                        className="flex-shrink-0 px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(34,197,94,0.15)",
                          color: "#22C55E",
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                        }}
                      >
                        SERIES
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs"
                      style={{ color: "#6B7280" }}
                    >
                      <FolderOpen size={9} />
                      <span>{item.data.itemCount} items</span>
                      <span>&middot;</span>
                      <Clock size={9} />
                      <span>{formatRelativeTime(item.data.lastEdited)}</span>
                    </div>
                  </div>
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}
