import { X } from "lucide-react";
import { useState } from "react";
import type { Series } from "../lib/types";

type ProjectTypeLocal = "Screenplay" | "Novel";
type ModalType = ProjectTypeLocal | "Series";

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (title: string, type: ProjectTypeLocal) => void;
  onCreateSeries?: (title: string, description?: string) => void;
  defaultType?: ModalType;
}

export function NewProjectModal({
  onClose,
  onCreate,
  onCreateSeries,
  defaultType = "Screenplay",
}: NewProjectModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ModalType>(defaultType);
  const [error, setError] = useState("");

  function handleCreate() {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }
    if (type === "Series") {
      onCreateSeries?.(title.trim(), description.trim() || undefined);
    } else {
      onCreate(title.trim(), type);
    }
    onClose();
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") onClose();
  }

  const TYPE_OPTIONS: {
    id: ModalType;
    label: string;
    emoji: string;
    desc: string;
  }[] = [
    {
      id: "Screenplay",
      label: "Screenplay",
      emoji: "🎬",
      desc: "Cinematic script format",
    },
    { id: "Novel", label: "Novel", emoji: "📖", desc: "Long-form narrative" },
    { id: "Series", label: "Series", emoji: "📚", desc: "Episodes & folders" },
  ];

  return (
    <dialog
      data-ocid="new_project.modal"
      open
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 w-full h-full max-w-none max-h-none border-0 m-0"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 relative"
        style={{
          background: "rgba(14,14,14,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="modal-title" className="text-2xl font-bold text-white">
            New Project
          </h2>
          <button
            type="button"
            data-ocid="new_project.close_button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Type selector — 3 options */}
        <fieldset className="mb-5 border-0 p-0 m-0">
          <legend
            className="block text-sm font-medium mb-2"
            style={{ color: "#9AA0A6" }}
          >
            Project Type
          </legend>
          <div className="flex gap-2">
            {TYPE_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.id}
                data-ocid={`new_project.${opt.id.toLowerCase()}.toggle`}
                onClick={() => setType(opt.id)}
                aria-pressed={type === opt.id}
                className="flex-1 py-3 px-2 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer flex flex-col items-center gap-1"
                style={{
                  background:
                    type === opt.id
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(255,255,255,0.04)",
                  border:
                    type === opt.id
                      ? "1px solid rgba(34,197,94,0.6)"
                      : "1px solid rgba(255,255,255,0.08)",
                  color: type === opt.id ? "#22C55E" : "#9AA0A6",
                }}
              >
                <span style={{ fontSize: "18px" }}>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Title input */}
        <div className="mb-4">
          <label
            htmlFor="project-title"
            className="block text-sm font-medium mb-2"
            style={{ color: "#9AA0A6" }}
          >
            {type === "Series" ? "Series Title" : "Project Title"}
          </label>
          <input
            id="project-title"
            data-ocid="new_project.input"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={
              type === "Series"
                ? "e.g. Possession, Isekai Chronicles..."
                : "Enter your project title..."
            }
            className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: error
                ? "1px solid rgba(239,68,68,0.6)"
                : "1px solid rgba(255,255,255,0.08)",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
            onFocus={(e) => {
              if (!error)
                e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)";
            }}
            onBlur={(e) => {
              if (!error)
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          />
          {error && (
            <p
              data-ocid="new_project.error_state"
              className="mt-2 text-sm"
              style={{ color: "#ef4444" }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Description (Series only) */}
        {type === "Series" && (
          <div className="mb-5">
            <label
              htmlFor="series-description"
              className="block text-sm font-medium mb-2"
              style={{ color: "#9AA0A6" }}
            >
              Description (optional)
            </label>
            <input
              id="series-description"
              data-ocid="new_project.description.input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your series..."
              className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            />
          </div>
        )}

        <button
          type="button"
          data-ocid="new_project.submit_button"
          onClick={handleCreate}
          className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 cursor-pointer mb-3"
          style={{
            background: "#22C55E",
            color: "#050505",
            boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#16a34a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#22C55E";
          }}
        >
          {type === "Series" ? "Create Series" : "Create Project"}
        </button>
        <button
          type="button"
          data-ocid="new_project.cancel_button"
          onClick={onClose}
          className="w-full py-2 text-sm transition-colors cursor-pointer"
          style={{ color: "#6B7280" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#9AA0A6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#6B7280";
          }}
        >
          Cancel
        </button>
      </div>
    </dialog>
  );
}

// Re-export Series type for convenience
export type { Series };
