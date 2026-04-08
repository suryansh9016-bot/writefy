import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Film,
  FolderOpen,
  FolderPlus,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  createProject,
  createSeriesItem,
  loadProjects,
  saveProject,
  saveSingleSeries,
} from "../lib/storage";
import type { Project, Series, SeriesItem } from "../lib/types";

interface SeriesScreenProps {
  series: Series;
  onBack: () => void;
  onOpenProject: (project: Project) => void;
  onSeriesUpdate: (updated: Series) => void;
}

type AddMode =
  | null
  | "folder"
  | "episode"
  | { parentFolderId: string; mode: "folder" | "episode" };

function EpisodeIcon({
  projectType,
}: { projectType?: "Screenplay" | "Novel" }) {
  if (projectType === "Screenplay")
    return <Film size={14} style={{ color: "#22C55E" }} />;
  return <BookOpen size={14} style={{ color: "#22C55E" }} />;
}

interface FolderItemProps {
  item: SeriesItem;
  index: number;
  onOpenEpisode: (projectId: string) => void;
  onDelete: (id: string, parentId?: string) => void;
  onAddInFolder: (folderId: string, mode: "episode" | "folder") => void;
  isDay: boolean;
}

function FolderItem({
  item,
  index,
  onOpenEpisode,
  onDelete,
  onAddInFolder,
  isDay,
}: FolderItemProps) {
  const [open, setOpen] = useState(true);
  const textColor = isDay ? "#1a1a1a" : "#e5e7eb";
  const subTextColor = isDay ? "#555555" : "#9AA0A6";

  return (
    <div
      data-ocid={`series.folder.item.${index + 1}`}
      style={{
        background: isDay ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
        overflow: "hidden",
        marginBottom: "8px",
      }}
    >
      {/* Folder header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 14px",
          cursor: "pointer",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FolderOpen size={15} style={{ color: "#22C55E" }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "13px", color: textColor }}>
            {item.name}
          </span>
          <span
            style={{ fontSize: "10px", color: subTextColor, marginLeft: "4px" }}
          >
            {item.children?.length ?? 0} items
          </span>
          {open ? (
            <ChevronDown
              size={14}
              style={{ color: subTextColor, marginLeft: "auto" }}
            />
          ) : (
            <ChevronRight
              size={14}
              style={{ color: subTextColor, marginLeft: "auto" }}
            />
          )}
        </button>
        <button
          type="button"
          onClick={() => onAddInFolder(item.id, "episode")}
          title="Add episode in folder"
          style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: "6px",
            padding: "4px 7px",
            color: "#22C55E",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          <Plus size={11} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          title="Delete folder"
          style={{
            background: "transparent",
            border: "none",
            color: "#6B7280",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Children */}
      {open && (
        <div style={{ padding: "0 14px 10px 14px" }}>
          {(item.children ?? []).length === 0 ? (
            <p
              style={{
                fontSize: "12px",
                color: subTextColor,
                padding: "6px 0",
              }}
            >
              No episodes yet
            </p>
          ) : (
            (item.children ?? []).map((child, ci) => (
              <EpisodeRow
                key={child.id}
                item={child}
                index={ci}
                onOpen={onOpenEpisode}
                onDelete={(id) => onDelete(id, item.id)}
                isDay={isDay}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface EpisodeRowProps {
  item: SeriesItem;
  index: number;
  onOpen: (projectId: string) => void;
  onDelete: (id: string) => void;
  isDay: boolean;
}

function EpisodeRow({ item, index, onOpen, onDelete, isDay }: EpisodeRowProps) {
  const textColor = isDay ? "#1a1a1a" : "#e5e7eb";
  const subTextColor = isDay ? "#555555" : "#9AA0A6";

  return (
    <div
      data-ocid={`series.episode.item.${index + 1}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "10px",
        background: isDay ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "6px",
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(34,197,94,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor =
          "rgba(255,255,255,0.06)";
      }}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "7px",
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <EpisodeIcon projectType={item.projectType} />
      </div>
      <button
        type="button"
        style={{
          flex: 1,
          background: "none",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
        }}
        onClick={() => {
          if (item.projectId) onOpen(item.projectId);
        }}
      >
        <p style={{ fontSize: "13px", fontWeight: 600, color: textColor }}>
          {item.name}
        </p>
        <p style={{ fontSize: "10px", color: subTextColor }}>
          {item.projectType ?? "Episode"}
        </p>
      </button>
      <div
        style={{
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          background: "rgba(34,197,94,0.1)",
          color: "#22C55E",
          borderRadius: "4px",
          padding: "2px 6px",
        }}
      >
        EP {index + 1}
      </div>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        title="Delete episode"
        style={{
          background: "transparent",
          border: "none",
          color: "#6B7280",
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export function SeriesScreen({
  series,
  onBack,
  onOpenProject,
  onSeriesUpdate,
}: SeriesScreenProps) {
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [inputName, setInputName] = useState("");
  const [episodeType, setEpisodeType] = useState<"Screenplay" | "Novel">(
    "Novel",
  );
  const [inputError, setInputError] = useState("");

  const isDay = document.body.getAttribute("data-theme") === "day";
  const textColor = isDay ? "#1a1a1a" : "#ffffff";
  const subTextColor = isDay ? "#555555" : "#9AA0A6";
  const cardBg = isDay ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.75)";

  const topItems = series.items;
  const episodeItems = topItems.filter((i) => i.type === "episode");
  const folderItems = topItems.filter((i) => i.type === "folder");

  function handleConfirmAdd() {
    if (!inputName.trim()) {
      setInputError("Please enter a name");
      return;
    }

    let updatedSeries: Series;

    if (!addMode) return;

    // Adding inside a folder
    if (typeof addMode === "object" && "parentFolderId" in addMode) {
      const folderId = addMode.parentFolderId;
      const mode = addMode.mode;

      let newProject: Project | null = null;
      if (mode === "episode") {
        newProject = createProject(inputName.trim(), episodeType);
        saveProject(newProject);
      }

      const newItem = createSeriesItem(
        inputName.trim(),
        mode,
        999,
        mode === "episode" ? episodeType : undefined,
        newProject?.id,
      );

      const updatedItems = series.items.map((item) => {
        if (item.id === folderId) {
          return {
            ...item,
            children: [...(item.children ?? []), newItem],
          };
        }
        return item;
      });

      updatedSeries = {
        ...series,
        items: updatedItems,
        itemCount: updatedItems.length,
        lastEdited: Date.now(),
      };
    } else if (addMode === "folder") {
      const newItem = createSeriesItem(
        inputName.trim(),
        "folder",
        series.items.length,
      );
      const updatedItems = [...series.items, newItem];
      updatedSeries = {
        ...series,
        items: updatedItems,
        itemCount: updatedItems.length,
        lastEdited: Date.now(),
      };
    } else {
      // top-level episode
      const newProject = createProject(inputName.trim(), episodeType);
      saveProject(newProject);
      const newItem = createSeriesItem(
        inputName.trim(),
        "episode",
        series.items.length,
        episodeType,
        newProject.id,
      );
      const updatedItems = [...series.items, newItem];
      updatedSeries = {
        ...series,
        items: updatedItems,
        itemCount: updatedItems.length,
        lastEdited: Date.now(),
      };
    }

    saveSingleSeries(updatedSeries);
    onSeriesUpdate(updatedSeries);
    setAddMode(null);
    setInputName("");
    setInputError("");
  }

  function handleDeleteItem(id: string, parentId?: string) {
    let updatedItems: SeriesItem[];
    if (parentId) {
      updatedItems = series.items.map((item) => {
        if (item.id === parentId) {
          return {
            ...item,
            children: (item.children ?? []).filter((c) => c.id !== id),
          };
        }
        return item;
      });
    } else {
      updatedItems = series.items.filter((i) => i.id !== id);
    }
    const updatedSeries: Series = {
      ...series,
      items: updatedItems,
      itemCount: updatedItems.length,
      lastEdited: Date.now(),
    };
    saveSingleSeries(updatedSeries);
    onSeriesUpdate(updatedSeries);
  }

  function handleOpenEpisode(projectId: string) {
    const projects = loadProjects();
    const project = projects.find((p) => p.id === projectId);
    if (project) onOpenProject(project);
  }

  return (
    <div
      data-ocid="series.page"
      className="min-h-screen relative z-10"
      style={{ paddingBottom: "calc(8vh + 28px)" }}
    >
      {/* Header */}
      <div style={{ padding: "20px 16px 12px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <button
            type="button"
            data-ocid="series.back.button"
            onClick={onBack}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: isDay ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              color: subTextColor,
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: textColor,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {series.title}
            </h1>
            {series.description && (
              <p
                style={{
                  fontSize: "12px",
                  color: subTextColor,
                  marginTop: "2px",
                }}
              >
                {series.description}
              </p>
            )}
          </div>
          {/* Add buttons */}
          <button
            type="button"
            data-ocid="series.add_folder.button"
            onClick={() => setAddMode("folder")}
            title="Add folder"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: "8px",
              padding: "7px 10px",
              color: "#22C55E",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <FolderPlus size={14} />
            Folder
          </button>
          <button
            type="button"
            data-ocid="series.add_episode.button"
            onClick={() => setAddMode("episode")}
            title="Add episode"
            style={{
              background: "#22C55E",
              border: "none",
              borderRadius: "8px",
              padding: "7px 10px",
              color: "#050505",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <Plus size={14} />
            Episode
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "12px", padding: "0 2px" }}>
          <span style={{ fontSize: "11px", color: subTextColor }}>
            {folderItems.length} folders
          </span>
          <span style={{ fontSize: "11px", color: subTextColor }}>·</span>
          <span style={{ fontSize: "11px", color: subTextColor }}>
            {episodeItems.length +
              folderItems.reduce(
                (a, f) => a + (f.children?.length ?? 0),
                0,
              )}{" "}
            episodes
          </span>
        </div>
      </div>

      {/* Add Modal inline */}
      {addMode !== null && (
        <div
          data-ocid="series.add.modal"
          style={{
            margin: "0 16px 16px 16px",
            background: isDay
              ? "rgba(255,255,255,0.85)"
              : "rgba(15,15,15,0.97)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: "14px",
            padding: "16px",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#22C55E",
              marginBottom: "10px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {typeof addMode === "object"
              ? `Add ${addMode.mode} in folder`
              : addMode === "folder"
                ? "New Folder"
                : "New Episode"}
          </p>
          <input
            type="text"
            data-ocid="series.add.input"
            value={inputName}
            onChange={(e) => {
              setInputName(e.target.value);
              setInputError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConfirmAdd();
              if (e.key === "Escape") {
                setAddMode(null);
                setInputName("");
              }
            }}
            placeholder={
              addMode === "folder" ||
              (typeof addMode === "object" && addMode.mode === "folder")
                ? "Folder name..."
                : "Episode title..."
            }
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "9px",
              background: isDay ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
              border: inputError
                ? "1px solid rgba(239,68,68,0.6)"
                : "1px solid rgba(255,255,255,0.1)",
              color: textColor,
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "8px",
            }}
            // biome-ignore lint/a11y/noAutofocus: intentional focus for inline modal
            autoFocus
          />
          {inputError && (
            <p
              data-ocid="series.add.error_state"
              style={{
                fontSize: "11px",
                color: "#ef4444",
                marginBottom: "8px",
              }}
            >
              {inputError}
            </p>
          )}
          {/* Episode type picker */}
          {(addMode === "episode" ||
            (typeof addMode === "object" && addMode.mode === "episode")) && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              {(["Novel", "Screenplay"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEpisodeType(t)}
                  style={{
                    flex: 1,
                    padding: "7px",
                    borderRadius: "8px",
                    background:
                      episodeType === t
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      episodeType === t
                        ? "1px solid rgba(34,197,94,0.5)"
                        : "1px solid rgba(255,255,255,0.08)",
                    color: episodeType === t ? "#22C55E" : subTextColor,
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              data-ocid="series.add.confirm_button"
              onClick={handleConfirmAdd}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: "9px",
                background: "#22C55E",
                border: "none",
                color: "#050505",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Create
            </button>
            <button
              type="button"
              data-ocid="series.add.cancel_button"
              onClick={() => {
                setAddMode(null);
                setInputName("");
                setInputError("");
              }}
              style={{
                flex: 1,
                padding: "9px",
                borderRadius: "9px",
                background: isDay
                  ? "rgba(0,0,0,0.07)"
                  : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: subTextColor,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "0 16px" }}>
        {topItems.length === 0 ? (
          <div
            data-ocid="series.empty_state"
            style={{
              textAlign: "center",
              padding: "60px 0",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px auto",
              }}
            >
              <BookMarked size={24} style={{ color: "rgba(34,197,94,0.5)" }} />
            </div>
            <p
              style={{
                fontWeight: 600,
                color: subTextColor,
                marginBottom: "4px",
              }}
            >
              No content yet
            </p>
            <p style={{ fontSize: "12px", color: isDay ? "#888" : "#4B5563" }}>
              Add a folder or episode to get started
            </p>
          </div>
        ) : (
          <>
            {/* Folders */}
            {folderItems.map((item, idx) => (
              <FolderItem
                key={item.id}
                item={item}
                index={idx}
                onOpenEpisode={handleOpenEpisode}
                onDelete={handleDeleteItem}
                onAddInFolder={(folderId, mode) =>
                  setAddMode({ parentFolderId: folderId, mode })
                }
                isDay={isDay}
              />
            ))}

            {/* Top-level episodes */}
            {episodeItems.length > 0 && (
              <div
                style={{
                  background: cardBg,
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "14px",
                  padding: "12px",
                  marginBottom: "8px",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: subTextColor,
                    textTransform: "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  Episodes
                </p>
                {episodeItems.map((item, idx) => (
                  <EpisodeRow
                    key={item.id}
                    item={item}
                    index={idx}
                    onOpen={handleOpenEpisode}
                    onDelete={(id) => handleDeleteItem(id)}
                    isDay={isDay}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
