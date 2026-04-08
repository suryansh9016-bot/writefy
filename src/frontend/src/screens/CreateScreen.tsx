import {
  AlignCenter,
  AlignLeft,
  ArrowLeft,
  ChevronRight,
  GripVertical,
  MapPin,
  MessageSquare,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Upload,
  User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { countWords, saveProject } from "../lib/storage";
import type { Theme } from "../lib/themes";
import type { FormatType, Project, SceneItem } from "../lib/types";
import type { LineType } from "../lib/useScreenplayEngine";
import { useScreenplayEngine } from "../lib/useScreenplayEngine";

interface CreateScreenProps {
  project: Project | null;
  onBack: () => void;
  onProjectUpdate: (project: Project) => void;
  activeTheme?: Theme;
  onSaveAndReturn?: () => void;
}

type EditorTab = "write" | "outline";

// Map legacy FormatType → LineType for toolbar
const FORMAT_TO_LINE: Record<FormatType, LineType> = {
  slugline: "scene-heading",
  action: "action",
  character: "character",
  dialogue: "dialogue",
};

const FORMAT_OPTIONS: {
  id: FormatType;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}[] = [
  { id: "slugline", label: "Slugline", icon: MapPin },
  { id: "action", label: "Action", icon: AlignLeft },
  { id: "character", label: "Character", icon: User },
  { id: "dialogue", label: "Dialogue", icon: MessageSquare },
];

// ─── Screenplay assist lists ──────────────────────────────────────────────────

const TRANSITIONS_LIST = [
  "CUT TO:",
  "SMASH CUT:",
  "MATCH CUT:",
  "JUMP CUT:",
  "DISSOLVE TO:",
  "FADE IN:",
  "FADE OUT:",
  "WIPE TO:",
  "L CUT:",
  "J CUT:",
];

const SHOT_TYPES_LIST = [
  "CLOSE UP (CU)",
  "EXTREME CLOSE UP (ECU)",
  "MEDIUM SHOT (MS)",
  "LONG SHOT (LS)",
  "OVER THE SHOULDER (OTS)",
  "POV SHOT",
  "WIDE SHOT",
  "TRACKING SHOT",
  "PAN SHOT",
  "TILT SHOT",
];

const VO_TYPES_LIST = [
  "(V.O.)",
  "(O.S.)",
  "(CONT'D)",
  "(FILTERED)",
  "(PHONE)",
  "(RADIO)",
];

const NOVEL_TOOLS = [
  { id: "bold", label: "B", title: "Bold", cmd: "bold" },
  { id: "italic", label: "I", title: "Italic", cmd: "italic" },
  { id: "underline", label: "U", title: "Underline", cmd: "underline" },
  { id: "h1", label: "H1", title: "Heading 1", block: "h1" },
  { id: "h2", label: "H2", title: "Heading 2", block: "h2" },
  { id: "quote", label: "\u276e", title: "Blockquote", block: "blockquote" },
  {
    id: "strike",
    label: "S\u0336",
    title: "Strikethrough",
    cmd: "strikeThrough",
  },
  { id: "hr", label: "\u2014", title: "Divider", insert: "hr" },
] as const;

const EDITOR_FONTS = [
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "League Spartan", value: "'League Spartan', sans-serif" },
  { label: "Lora", value: "Lora, serif" },
  { label: "Comic Sans", value: "'Comic Sans MS', cursive" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Merriweather", value: "Merriweather, serif" },
  { label: "Libre Baskerville", value: "'Libre Baskerville', serif" },
  { label: "Cormorant Garamond", value: "'Cormorant Garamond', serif" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Roboto Slab", value: "'Roboto Slab', serif" },
  { label: "Source Serif Pro", value: "'Source Serif 4', serif" },
];

// ─── Line style helper ─────────────────────────────────────────────────────────────────────

function getLineStyle(
  type: LineType,
  isActive: boolean,
  isDay: boolean,
  fontSize: number,
): React.CSSProperties {
  const activeBg = isDay ? "rgba(0,0,0,0.025)" : "rgba(255,255,255,0.018)";
  const textColor = isDay ? "#1a1a1a" : "#d8d8d8";

  const base: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    fontSize: `${fontSize}px`,
    lineHeight: "1.75",
    minHeight: "1.75em",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    outline: "none",
    cursor: "text",
    transition: "background 0.1s, border-left-color 0.1s",
    background: isActive ? activeBg : "transparent",
    color: textColor,
    padding: "1px 0",
  };

  switch (type) {
    // SCENE HEADING: full width, all caps, bold, courier
    case "scene-heading":
      return {
        ...base,
        textTransform: "uppercase",
        fontWeight: 700,
        fontFamily: "'Courier New', Courier, monospace",
        letterSpacing: "0.04em",
        borderLeft: isActive ? "3px solid #22C55E" : "3px solid transparent",
        paddingLeft: "8px",
        marginTop: "12px",
        color: isDay ? "#1a1a1a" : "#e8e8e8",
      };

    // ACTION: full width, sentence case, default
    case "action":
      return {
        ...base,
        paddingLeft: "0",
        paddingRight: "0",
      };

    // CHARACTER: centered, all-caps, bold — occupies middle column
    case "character":
      return {
        ...base,
        display: "block",
        textAlign: "center",
        textTransform: "uppercase",
        fontWeight: 700,
        letterSpacing: "0.1em",
        // Indent to create centered-column look matching industry format
        paddingLeft: "25%",
        paddingRight: "25%",
        marginTop: "8px",
        fontSize: `${Math.max(11, fontSize)}px`,
        color: isDay ? "#1a1a1a" : "#f0f0f0",
        fontFamily: "'Courier New', Courier, monospace",
      };

    // DIALOGUE: narrower centered block, like industry scripts
    case "dialogue":
      return {
        ...base,
        paddingLeft: "18%",
        paddingRight: "18%",
        color: isDay ? "#2a2a2a" : "#cccccc",
        fontFamily: "'Courier New', Courier, monospace",
      };

    // PARENTHETICAL: narrower than dialogue, italic
    case "parenthetical":
      return {
        ...base,
        paddingLeft: "28%",
        paddingRight: "28%",
        fontStyle: "italic",
        color: isDay ? "#555555" : "#aaaaaa",
        fontFamily: "'Courier New', Courier, monospace",
      };

    // TRANSITION: right-aligned, all-caps
    case "transition":
      return {
        ...base,
        textAlign: "right",
        textTransform: "uppercase",
        fontWeight: 600,
        letterSpacing: "0.05em",
        paddingRight: "0",
        marginTop: "8px",
        color: isDay ? "#1a1a1a" : "#e0e0e0",
        fontFamily: "'Courier New', Courier, monospace",
      };

    // SHOT: full-width, uppercase, action-style block
    case "shot":
      return {
        ...base,
        textTransform: "uppercase",
        fontWeight: 600,
        fontFamily: "'Courier New', Courier, monospace",
        paddingLeft: "0",
        paddingRight: "0",
        marginTop: "4px",
        color: isDay ? "#1a1a1a" : "#e0e0e0",
      };

    default:
      return base;
  }
}

// ─── ScreenplayLine component ────────────────────────────────────────────────────────────────────

interface ScreenplayLineProps {
  lineId: string;
  lineType: LineType;
  lineText: string;
  isActive: boolean;
  isDay: boolean;
  fontSize: number;
  editorFont: string;
  lineRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  isProgrammaticUpdateRef: React.MutableRefObject<Set<string>>;
  onFocus: () => void;
  onInput: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

function ScreenplayLine({
  lineId,
  lineType,
  lineText,
  isActive,
  isDay,
  fontSize,
  editorFont,
  lineRefs,
  isProgrammaticUpdateRef,
  onFocus,
  onInput,
  onKeyDown,
}: ScreenplayLineProps) {
  const divRef = useRef<HTMLDivElement | null>(null);

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      divRef.current = el;
      if (el) lineRefs.current.set(lineId, el);
      else lineRefs.current.delete(lineId);
    },
    [lineId, lineRefs],
  );

  // Only set innerText when there is a programmatic update (not user typing)
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    if (isProgrammaticUpdateRef.current.has(lineId)) {
      isProgrammaticUpdateRef.current.delete(lineId);
      if (el.innerText !== lineText) {
        el.innerText = lineText;
      }
    }
  });

  const style = getLineStyle(lineType, isActive, isDay, fontSize);

  // Scene headings always use Courier; other lines use user-selected font
  const fontFamily =
    lineType === "scene-heading" ||
    lineType === "character" ||
    lineType === "dialogue" ||
    lineType === "parenthetical" ||
    lineType === "transition" ||
    lineType === "shot"
      ? "'Courier New', Courier, monospace"
      : editorFont;

  return (
    <div
      ref={setRef}
      contentEditable
      suppressContentEditableWarning
      data-line-id={lineId}
      data-line-type={lineType}
      onFocus={onFocus}
      onInput={(e) => {
        // Read innerText without trailing newline that contentEditable adds
        let text = e.currentTarget.innerText.replace(/\n$/, "");
        const el = e.currentTarget;

        // Reverse common device autocorrect mistakes for screenplay keywords
        let processedText = text;
        if (/^(Extract|External)\b/i.test(text)) {
          processedText = text.replace(/^(Extract|External)\b/i, "EXT.");
        } else if (/^(Internal|Integer|Interesting|Interest)\b/i.test(text)) {
          processedText = text.replace(
            /^(Internal|Integer|Interesting|Interest)\b/i,
            "INT.",
          );
        }
        if (processedText !== text) {
          // Update DOM and restore cursor to end
          el.innerText = processedText;
          const range = document.createRange();
          const sel = window.getSelection();
          range.selectNodeContents(el);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
        onInput(processedText);
      }}
      onKeyDown={onKeyDown}
      style={{
        ...style,
        fontFamily,
      }}
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
    />
  );
}

// ─── CreateScreen ──────────────────────────────────────────────────────────────────────────────

export function CreateScreen({
  project,
  onBack,
  onProjectUpdate,
  activeTheme,
  onSaveAndReturn,
}: CreateScreenProps) {
  const [tab, setTab] = useState<EditorTab>("write");
  const [title, setTitle] = useState(project?.title ?? "");
  const [scenes, setScenes] = useState<SceneItem[]>(project?.scenes ?? []);
  const [newSceneTitle, setNewSceneTitle] = useState("");
  const [fontSize, setFontSize] = useState(14);
  const [editorFont, setEditorFont] = useState(
    "'Courier New', Courier, monospace",
  );
  const [saveStatus, setSaveStatus] = useState<string>("All changes saved");
  const [selectionToolbar, setSelectionToolbar] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  // ─── Pending mode for delayed Transition / Shot / VO selection ───────────────
  const [pendingMode, setPendingMode] = useState<
    "transition" | "shot" | "vo" | null
  >(null);
  const [selDropdownOpen, setSelDropdownOpen] = useState(false);

  // Track last saved project ID to detect project switches
  const lastProjectIdRef = useRef<string | null>(null);

  // Ref for Novel contenteditable div
  const novelEditorRef = useRef<HTMLDivElement | null>(null);
  // Ref for Novel scroll container (Feature 4: sticky toolbar)
  const novelScrollContainerRef = useRef<HTMLDivElement | null>(null);
  // Track if novel editor has been initialized with content
  const novelInitializedRef = useRef<string | null>(null);

  // ─── Novel character / place memory (Feature 6) ──────────────────────
  const [novelCharNames, setNovelCharNames] = useState<string[]>([]);
  const [novelPlaceNames, setNovelPlaceNames] = useState<string[]>([]);
  const [novelSuggestions, setNovelSuggestions] = useState<string[]>([]);
  const novelSuggestionMode = useRef<"char" | "place" | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);
  const projectRef = useRef(project);

  // ─── Typewriter mode ───────────────────────────────────────────────────────
  const [typewriterMode, setTypewriterMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("writefy_typewriter_mode");
    return stored === null ? true : stored === "true";
  });

  function toggleTypewriterMode() {
    setTypewriterMode((prev) => {
      const next = !prev;
      localStorage.setItem("writefy_typewriter_mode", String(next));
      return next;
    });
  }
  projectRef.current = project;
  const isDay = activeTheme?.isDay ?? false;

  // ─── Engine ──────────────────────────────────────────────────────────────────
  const engine = useScreenplayEngine({
    initialValue: project?.content ?? "",
    onContentChange: (_newValue: string) => {
      // Only mark "unsaved"; actual save happens manually or via keyboard
      setSaveStatus("Unsaved changes");
    },
  }) as ReturnType<typeof useScreenplayEngine> & {
    resetToValue: (v: string) => void;
    sceneSuggestions: string[];
    acceptSceneSuggestion: (s: string) => void;
  };

  // ─── Reset engine when project changes ────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: only reset when project ID changes
  useEffect(() => {
    const p = projectRef.current;
    if (!p) return;
    // Only fire when project ID actually changes
    if (lastProjectIdRef.current === p.id) return;
    lastProjectIdRef.current = p.id;
    setTitle(p.title);
    setScenes(p.scenes);
    setSaveStatus("All changes saved");
    // Reset the engine with new content
    engine.resetToValue(p.content ?? "");
    // Reset novel editor
    novelInitializedRef.current = null;
    // Clear any pending mode on project switch
    setPendingMode(null);
    setSelDropdownOpen(false);
  }, [project?.id]);

  // Initialize novel editor content when project changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: only init when project ID changes
  useEffect(() => {
    if (project?.type === "Novel" && novelEditorRef.current) {
      const content = project.content ?? "";
      if (novelInitializedRef.current !== project.id) {
        novelInitializedRef.current = project.id;
        novelEditorRef.current.innerHTML = content;
      }
    }
  }, [project?.id]);

  // ─── persistProject (only on demand) ──────────────────────────────────
  const persistProject = useCallback(
    (
      updatedContent: string,
      updatedTitle: string,
      updatedScenes: SceneItem[],
    ) => {
      const p = projectRef.current;
      if (!p) return;
      const updated: Project = {
        ...p,
        title: updatedTitle,
        content: updatedContent,
        scenes: updatedScenes,
        wordCount: countWords(updatedContent),
        sceneCount: updatedScenes.length,
        lastEdited: Date.now(),
      };
      saveProject(updated);
      onProjectUpdate(updated);
      const now = new Date();
      setSaveStatus(
        `Saved ${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}`,
      );
    },
    [onProjectUpdate],
  );

  // ─── Manual save ───────────────────────────────────────────────────────────────
  const handleManualSave = useCallback(() => {
    let content: string;
    if (projectRef.current?.type === "Novel") {
      content = novelEditorRef.current?.innerHTML ?? engine.value;
    } else {
      content = engine.serializedValue;
    }
    persistProject(content, title, scenes);
    if (onSaveAndReturn) onSaveAndReturn();
  }, [
    engine.serializedValue,
    engine.value,
    title,
    scenes,
    persistProject,
    onSaveAndReturn,
  ]);

  // ─── Ctrl+S keyboard shortcut for save ──────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleManualSave]);

  // ─── Autosave (background, non-destructive) ─────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs on serializedValue
  useEffect(() => {
    if (project?.type !== "Screenplay") return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      const content = engine.serializedValue;
      if (!content.trim()) return;
      const p = projectRef.current;
      if (!p) return;
      const updated: Project = {
        ...p,
        title,
        content,
        wordCount: countWords(content),
        lastEdited: Date.now(),
      };
      saveProject(updated);
      onProjectUpdate(updated);
      const now = new Date();
      setSaveStatus(
        `Auto-saved ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`,
      );
    }, 1500);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [engine.serializedValue]);

  // ─── Typewriter mode scroll ───────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - runs when active line changes
  useEffect(() => {
    if (!typewriterMode) return;
    if (projectRef.current?.type === "Novel") return; // handled separately
    if (!engine.activeLineId) return;
    const frameId = requestAnimationFrame(() => {
      const activeEl = engine.lineRefs.current.get(engine.activeLineId!);
      if (!activeEl) return;
      const rect = activeEl.getBoundingClientRect();
      const target = window.innerHeight * 0.45;
      const currentTop = rect.top;
      if (currentTop > target) {
        const delta = currentTop - target;
        window.scrollBy({ top: delta, behavior: "smooth" });
      }
    });
    return () => cancelAnimationFrame(frameId);
  }, [engine.activeLineId, engine.lines.length, typewriterMode]);

  // ─── execCommand helper ───────────────────────────────────────────────────
  // biome-ignore lint/suspicious/noExplicitAny: execCommand is deprecated but fully supported
  function execCmd(command: string, value?: string) {
    // biome-ignore lint/suspicious/noExplicitAny: execCommand is deprecated but fully supported
    (document as any).execCommand(command, false, value ?? undefined);
  }

  // ─── Select current line helper ───────────────────────────────────────────
  // If nothing selected, selects the current cursor line content before applying format
  function selectCurrentLineIfEmpty(el: HTMLElement): boolean {
    const sel = window.getSelection();
    if (!sel) return false;
    if (!sel.isCollapsed) return false; // already has selection
    // Get the block-level container of the cursor
    let node: Node | null = sel.anchorNode;
    if (!node) return false;
    // Walk up to find a block element inside el
    while (node && node !== el && node.nodeType !== Node.ELEMENT_NODE) {
      node = node.parentNode;
    }
    if (!node || node === el) {
      // Top-level: select all text nodes in current text run
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    }
    const blockEl = node as HTMLElement;
    if (blockEl.textContent?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(blockEl);
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    }
    return false;
  }

  // ─── Screenplay: select current active line if nothing selected ───────────
  function selectScreenplayLineIfEmpty(): boolean {
    if (!engine.activeLineId) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    if (!sel.isCollapsed) return false;
    const lineEl = engine.lineRefs.current.get(engine.activeLineId);
    if (!lineEl) return false;
    const range = document.createRange();
    range.selectNodeContents(lineEl);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }

  // ─── Novel tool helpers ────────────────────────────────────────────────
  function applyNovelTool(tool: (typeof NOVEL_TOOLS)[number]) {
    const editorEl = novelEditorRef.current;
    if (!editorEl) return;
    editorEl.focus();
    if ("insert" in tool && tool.insert === "hr") {
      execCmd("insertHorizontalRule");
    } else if ("block" in tool && tool.block) {
      execCmd("formatBlock", tool.block);
    } else if ("cmd" in tool && tool.cmd) {
      // Feature 7: If no selection, select current line first
      const sel = window.getSelection();
      const hadSelection = sel ? !sel.isCollapsed : false;
      if (!hadSelection) {
        selectCurrentLineIfEmpty(editorEl);
      }
      execCmd(tool.cmd);
    }
  }

  function handleNovelMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    const sel = document.getSelection();
    if (sel && !sel.isCollapsed && sel.toString().length > 0) {
      const editorRect = e.currentTarget.parentElement?.getBoundingClientRect();
      if (!editorRect) return;
      const x = e.clientX - editorRect.left;
      const y = e.clientY - editorRect.top - 50;
      setSelectionToolbar({
        visible: true,
        x: Math.max(0, x),
        y: Math.max(0, y),
      });
    } else {
      setSelectionToolbar((prev) => ({ ...prev, visible: false }));
    }
  }

  function applySelectionFormat(command: string) {
    execCmd(command);
    setSelectionToolbar({ visible: false, x: 0, y: 0 });
  }

  function handleTitleChange(val: string) {
    setTitle(val);
    setSaveStatus("Unsaved changes");
    // Debounce title save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      let content: string;
      if (projectRef.current?.type === "Novel") {
        content = novelEditorRef.current?.innerHTML ?? engine.value;
      } else {
        content = engine.serializedValue;
      }
      persistProject(content, val, scenes);
    }, 2000);
  }

  function handleAddScene() {
    if (!newSceneTitle.trim()) return;
    const newScene: SceneItem = {
      id: `scene_${Date.now()}`,
      title: newSceneTitle.trim(),
      content: "",
      type: "slugline",
    };
    const updated = [...scenes, newScene];
    setScenes(updated);
    setNewSceneTitle("");
    let content: string;
    if (project?.type === "Novel") {
      content = novelEditorRef.current?.innerHTML ?? engine.value;
    } else {
      content = engine.serializedValue;
    }
    persistProject(content, title, updated);
  }

  function handleDeleteScene(id: string) {
    const updated = scenes.filter((s) => s.id !== id);
    setScenes(updated);
    let content: string;
    if (project?.type === "Novel") {
      content = novelEditorRef.current?.innerHTML ?? engine.value;
    } else {
      content = engine.serializedValue;
    }
    persistProject(content, title, updated);
  }

  function handleSceneTitleChange(id: string, val: string) {
    const updated = scenes.map((s) => (s.id === id ? { ...s, title: val } : s));
    setScenes(updated);
    let content: string;
    if (project?.type === "Novel") {
      content = novelEditorRef.current?.innerHTML ?? engine.value;
    } else {
      content = engine.serializedValue;
    }
    persistProject(content, title, updated);
  }

  const titleColor = isDay ? "#1a1a1a" : "#ffffff";
  const subTextColor = isDay ? "#555555" : "#9AA0A6";
  const toolbarBg = isDay ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";
  const toolbarBorder = isDay
    ? "1px solid rgba(0,0,0,0.12)"
    : "1px solid rgba(255,255,255,0.08)";
  const toolbarColor = isDay ? "#333333" : "#9AA0A6";
  const editorBg = isDay ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.02)";
  const editorBorder = isDay
    ? "1px solid rgba(0,0,0,0.1)"
    : "1px solid rgba(255,255,255,0.06)";

  // Active format for toolbar highlighting
  const activeLineType = engine.activeFormat;
  const activeFormatId: FormatType =
    activeLineType === "scene-heading"
      ? "slugline"
      : activeLineType === "character"
        ? "character"
        : activeLineType === "dialogue"
          ? "dialogue"
          : "action";

  const wordCountDisplay = countWords(
    project?.type === "Novel"
      ? (novelEditorRef.current?.innerText ?? engine.value)
      : engine.serializedValue,
  );

  // ─── Import file ─────────────────────────────────────────────────────────────
  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (!text) return;
        if (project?.type === "Novel" && novelEditorRef.current) {
          // For novel: replace content with imported text as paragraphs
          const escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          novelEditorRef.current.innerHTML = escaped
            .split("\n\n")
            .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
            .join("");
        } else {
          // For screenplay: replace lines
          engine.replaceAllContent(text);
        }
        setSaveStatus("Unsaved changes");
      };
      reader.readAsText(file);
      // reset input so same file can be re-imported
      e.target.value = "";
    },
    // biome-ignore lint/correctness/useExhaustiveDependencies: novelEditorRef is a stable ref
    [project?.type, engine],
  );

  // ─── Parenthetical handler (smart: wrap selection or insert ()) ────────────
  const handleParenthetical = useCallback(() => {
    if (!engine.activeLineId) return;

    const sel = window.getSelection();
    const activeEl = engine.lineRefs.current.get(engine.activeLineId);

    if (
      sel &&
      sel.rangeCount > 0 &&
      !sel.isCollapsed &&
      activeEl &&
      activeEl.contains(sel.anchorNode)
    ) {
      // Case 2: text selected → wrap in parens
      const selectedText = sel.toString();
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const wrapped = document.createTextNode(`(${selectedText})`);
      range.insertNode(wrapped);
      sel.collapseToEnd();
      // Sync to engine
      const newText = (activeEl.innerText || "").replace(/\n$/, "");
      engine.setLineText(engine.activeLineId, newText);
      engine.setLineType(engine.activeLineId, "parenthetical");
    } else {
      // Case 1: no selection → set type to parenthetical (inserts "()")
      engine.setLineType(engine.activeLineId, "parenthetical");
      // After setLineType sets text to "()", place cursor between parens
      setTimeout(() => {
        if (!engine.activeLineId) return;
        const el = engine.lineRefs.current.get(engine.activeLineId);
        if (el) {
          const textNode = el.firstChild;
          if (textNode) {
            const range = document.createRange();
            const curSel = window.getSelection();
            try {
              range.setStart(textNode, 1);
              range.collapse(true);
              curSel?.removeAllRanges();
              curSel?.addRange(range);
            } catch (_e) {
              // fallback: place at end
            }
          }
        }
      }, 30);
    }
  }, [engine]);

  // ─── Selection insert handler (Transition / Shot / VO) ───────────────────────
  const handleSelectionInsert = useCallback(
    (item: string) => {
      setSelDropdownOpen(false);
      const currentPendingMode = pendingMode;
      setPendingMode(null);

      if (!engine.activeLineId) return;

      if (currentPendingMode === "transition") {
        engine.setLineType(engine.activeLineId, "transition");
        engine.setLineText(engine.activeLineId, item);
        engine.isProgrammaticUpdateRef.current.add(engine.activeLineId);
        setTimeout(() => engine.focusLine(engine.activeLineId!, true), 50);
      } else if (currentPendingMode === "shot") {
        engine.setLineType(engine.activeLineId, "shot");
        // Normalize shot: take text before "(" and uppercase with colon
        const shotLabel = item.split("(")[0].trim().toUpperCase();
        const shotText = shotLabel.endsWith(":") ? shotLabel : `${shotLabel}:`;
        engine.setLineText(engine.activeLineId, shotText);
        engine.isProgrammaticUpdateRef.current.add(engine.activeLineId);
        setTimeout(() => engine.focusLine(engine.activeLineId!, true), 50);
      } else if (currentPendingMode === "vo") {
        // VO attaches to character name — look for nearest character line above
        const lines = engine.lines;
        const currentIdx = lines.findIndex((l) => l.id === engine.activeLineId);
        // Find the current or preceding character line
        let charLineId: string | null = null;
        for (let i = currentIdx; i >= 0; i--) {
          if (lines[i].type === "character") {
            charLineId = lines[i].id;
            break;
          }
        }
        if (charLineId) {
          engine.insertVOOnCharacter(charLineId, item);
        } else {
          // No character line found: make current line a character with VO suffix
          engine.setLineType(engine.activeLineId, "character");
          engine.setLineText(engine.activeLineId, `CHARACTER ${item}`);
          engine.isProgrammaticUpdateRef.current.add(engine.activeLineId);
          setTimeout(() => engine.focusLine(engine.activeLineId!, true), 50);
        }
      }
    },
    [pendingMode, engine],
  );

  // ─── Capture keydown to intercept typing when pendingMode is set ──────────
  const handleEditorKeyDownCapture = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!pendingMode) return;
      // Only intercept printable keys and Enter — not modifiers or special keys
      const isPrintable =
        e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
      const isEnter = e.key === "Enter";
      if ((isPrintable || isEnter) && !selDropdownOpen) {
        e.preventDefault();
        e.stopPropagation();
        setSelDropdownOpen(true);
      }
      // ESC clears pending mode
      if (e.key === "Escape") {
        setPendingMode(null);
        setSelDropdownOpen(false);
      }
    },
    [pendingMode, selDropdownOpen],
  );

  if (!project) {
    return (
      <div
        data-ocid="create.page"
        className="min-h-screen flex items-center justify-center pb-36 relative z-10"
      >
        <div className="text-center px-6">
          <p style={{ color: titleColor }} className="font-semibold mb-2">
            No project selected
          </p>
          <p className="text-sm" style={{ color: subTextColor }}>
            Go to Library to open a project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-ocid="create.page"
      className="min-h-screen pb-36 relative z-10 flex flex-col"
    >
      {/* Top area */}
      <div className="px-4 pb-0" style={{ paddingTop: "20px" }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            data-ocid="create.back.button"
            onClick={onBack}
            className="flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 cursor-pointer flex-shrink-0"
            style={{
              background: isDay ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)",
              color: subTextColor,
            }}
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <input
              data-ocid="create.title.input"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full bg-transparent text-xl font-bold outline-none placeholder-gray-600 truncate"
              placeholder="Untitled Project"
              style={{ letterSpacing: "-0.02em", color: titleColor }}
            />
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(34,197,94,0.15)",
                  color: "#22C55E",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                {project.type.toUpperCase()}
              </span>
              <span
                className="text-xs"
                style={{ color: isDay ? "#888" : "#6B7280" }}
              >
                {wordCountDisplay.toLocaleString()} words
              </span>
              <span
                className="text-xs"
                style={{
                  color: isDay ? "#888" : "#4B5563",
                }}
              >
                &middot; {saveStatus}
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex gap-6"
          style={{
            borderBottom: isDay
              ? "1px solid rgba(0,0,0,0.1)"
              : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {(["write", "outline"] as EditorTab[]).map((t) => (
            <button
              type="button"
              key={t}
              data-ocid={`create.${t}.tab`}
              onClick={() => setTab(t)}
              className="pb-3 text-sm font-semibold capitalize transition-all duration-200 cursor-pointer relative"
              style={{
                color: tab === t ? titleColor : isDay ? "#888" : "#6B7280",
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {tab === t && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "#22C55E" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "write" ? (
        <div className="flex flex-col flex-1 px-4 pt-4">
          {/* Toolbar */}
          <div
            className="flex gap-2 overflow-x-auto scrollbar-hide items-center"
            style={{
              position: "sticky",
              top: "80px",
              zIndex: 20,
              background: isDay ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.85)",
              backdropFilter: "blur(8px)",
              paddingTop: "8px",
              paddingBottom: "8px",
            }}
          >
            {/* Undo */}
            <button
              type="button"
              data-ocid="create.undo.button"
              onClick={engine.undo}
              title="Undo (Ctrl+Z)"
              className="flex-shrink-0 flex items-center justify-center px-2 py-2 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                background: toolbarBg,
                border: toolbarBorder,
                color: toolbarColor,
              }}
            >
              <Undo2 size={13} />
            </button>
            {/* Redo */}
            <button
              type="button"
              data-ocid="create.redo.button"
              onClick={engine.redo}
              title="Redo (Ctrl+Y)"
              className="flex-shrink-0 flex items-center justify-center px-2 py-2 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                background: toolbarBg,
                border: toolbarBorder,
                color: toolbarColor,
              }}
            >
              <Redo2 size={13} />
            </button>

            {/* Format tools */}
            {project.type === "Novel" ? (
              NOVEL_TOOLS.map((tool) => (
                <button
                  type="button"
                  key={tool.id}
                  title={tool.title}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyNovelTool(tool);
                  }}
                  className="flex-shrink-0 flex items-center justify-center px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    background: toolbarBg,
                    border: toolbarBorder,
                    color: toolbarColor,
                    minWidth: "30px",
                    fontStyle: tool.id === "italic" ? "italic" : "normal",
                    fontWeight: tool.id === "bold" ? 800 : 600,
                    textDecoration:
                      tool.id === "underline" ? "underline" : "none",
                  }}
                >
                  {tool.label}
                </button>
              ))
            ) : (
              // Screenplay format buttons: slugline, action, character, dialogue + paren + transition + shot + vo
              <>
                {FORMAT_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    type="button"
                    key={id}
                    data-ocid={`create.format.${id}.toggle`}
                    onClick={() => {
                      if (engine.activeLineId) {
                        engine.setLineType(
                          engine.activeLineId,
                          FORMAT_TO_LINE[id],
                        );
                      }
                      // Clear any pending mode when other format buttons are clicked
                      setPendingMode(null);
                      setSelDropdownOpen(false);
                    }}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                    style={{
                      background:
                        activeFormatId === id
                          ? "rgba(34,197,94,0.15)"
                          : toolbarBg,
                      border:
                        activeFormatId === id
                          ? "1px solid rgba(34,197,94,0.5)"
                          : toolbarBorder,
                      color: activeFormatId === id ? "#22C55E" : toolbarColor,
                    }}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
                {/* Parenthetical button — smart behavior */}
                <button
                  type="button"
                  data-ocid="create.format.parenthetical.toggle"
                  onClick={() => {
                    handleParenthetical();
                    setPendingMode(null);
                    setSelDropdownOpen(false);
                  }}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    background:
                      activeLineType === "parenthetical"
                        ? "rgba(34,197,94,0.15)"
                        : toolbarBg,
                    border:
                      activeLineType === "parenthetical"
                        ? "1px solid rgba(34,197,94,0.5)"
                        : toolbarBorder,
                    color:
                      activeLineType === "parenthetical"
                        ? "#22C55E"
                        : toolbarColor,
                  }}
                >
                  Paren
                </button>
                {/* Transition button — delayed trigger */}
                <button
                  type="button"
                  data-ocid="create.format.transition.toggle"
                  onClick={() => {
                    setPendingMode("transition");
                    setSelDropdownOpen(false);
                  }}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    background:
                      activeLineType === "transition" ||
                      pendingMode === "transition"
                        ? "rgba(34,197,94,0.15)"
                        : toolbarBg,
                    border:
                      activeLineType === "transition" ||
                      pendingMode === "transition"
                        ? "1px solid rgba(34,197,94,0.5)"
                        : toolbarBorder,
                    color:
                      activeLineType === "transition" ||
                      pendingMode === "transition"
                        ? "#22C55E"
                        : toolbarColor,
                  }}
                >
                  <ChevronRight size={11} />
                  Transition
                </button>
                {/* Shot button — delayed trigger */}
                <button
                  type="button"
                  data-ocid="create.format.shot.toggle"
                  onClick={() => {
                    setPendingMode("shot");
                    setSelDropdownOpen(false);
                  }}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    background:
                      activeLineType === "shot" || pendingMode === "shot"
                        ? "rgba(34,197,94,0.15)"
                        : toolbarBg,
                    border:
                      activeLineType === "shot" || pendingMode === "shot"
                        ? "1px solid rgba(34,197,94,0.5)"
                        : toolbarBorder,
                    color:
                      activeLineType === "shot" || pendingMode === "shot"
                        ? "#22C55E"
                        : toolbarColor,
                  }}
                >
                  Shot
                </button>
                {/* VO button — delayed trigger */}
                <button
                  type="button"
                  data-ocid="create.format.vo.toggle"
                  onClick={() => {
                    setPendingMode("vo");
                    setSelDropdownOpen(false);
                  }}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                  style={{
                    background:
                      pendingMode === "vo" ? "rgba(34,197,94,0.15)" : toolbarBg,
                    border:
                      pendingMode === "vo"
                        ? "1px solid rgba(34,197,94,0.5)"
                        : toolbarBorder,
                    color: pendingMode === "vo" ? "#22C55E" : toolbarColor,
                  }}
                >
                  VO
                </button>
              </>
            )}

            <div
              style={{
                width: "1px",
                height: "20px",
                background: isDay ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                flexShrink: 0,
              }}
            />

            {/* Font size */}
            <button
              type="button"
              data-ocid="create.font_decrease.button"
              onClick={() => setFontSize((s) => Math.max(11, s - 1))}
              title="Decrease font size"
              className="flex-shrink-0 flex items-center justify-center px-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
              style={{
                background: toolbarBg,
                border: toolbarBorder,
                color: toolbarColor,
              }}
            >
              A-
            </button>
            <span
              style={{
                fontSize: "10px",
                color: isDay ? "#888" : "#4B5563",
                flexShrink: 0,
                minWidth: "16px",
                textAlign: "center",
              }}
            >
              {fontSize}
            </span>
            <button
              type="button"
              data-ocid="create.font_increase.button"
              onClick={() => setFontSize((s) => Math.min(22, s + 1))}
              title="Increase font size"
              className="flex-shrink-0 flex items-center justify-center px-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
              style={{
                background: toolbarBg,
                border: toolbarBorder,
                color: toolbarColor,
              }}
            >
              A+
            </button>

            <div
              style={{
                width: "1px",
                height: "20px",
                background: isDay ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                flexShrink: 0,
              }}
            />

            {/* B / I / U / S̶ buttons */}
            {(
              [
                {
                  id: "bold",
                  label: "B",
                  cmd: "bold",
                  style: { fontWeight: 800 },
                },
                {
                  id: "italic",
                  label: "I",
                  cmd: "italic",
                  style: { fontStyle: "italic" as const },
                },
                {
                  id: "underline",
                  label: "U",
                  cmd: "underline",
                  style: { textDecoration: "underline" },
                },
                {
                  id: "strike",
                  label: "S\u0336",
                  cmd: "strikeThrough",
                  style: { textDecoration: "line-through" },
                },
              ] as const
            ).map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                title={fmt.id.charAt(0).toUpperCase() + fmt.id.slice(1)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  // Feature 7: if no selection, select current line first
                  selectScreenplayLineIfEmpty();
                  execCmd(fmt.cmd);
                }}
                className="flex-shrink-0 flex items-center justify-center px-2.5 py-2 rounded-lg text-xs transition-all duration-200 cursor-pointer"
                style={{
                  background: toolbarBg,
                  border: toolbarBorder,
                  color: toolbarColor,
                  minWidth: "28px",
                  ...fmt.style,
                }}
              >
                {fmt.label}
              </button>
            ))}

            <div
              style={{
                width: "1px",
                height: "20px",
                background: isDay ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                flexShrink: 0,
              }}
            />

            {/* Font selector */}
            <select
              data-ocid="create.font.select"
              value={editorFont}
              onChange={(e) => setEditorFont(e.target.value)}
              style={{
                background: toolbarBg,
                border: toolbarBorder,
                color: toolbarColor,
                borderRadius: "8px",
                padding: "6px 8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                outline: "none",
                flexShrink: 0,
                maxWidth: "120px",
              }}
              title="Change editor font"
            >
              {EDITOR_FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            <div
              style={{
                width: "1px",
                height: "20px",
                background: isDay ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                flexShrink: 0,
              }}
            />

            {/* Manual Save */}
            <button
              type="button"
              data-ocid="create.save.button"
              onClick={handleManualSave}
              title="Save (Ctrl+S)"
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                background: toolbarBg,
                border: toolbarBorder,
                color: toolbarColor,
              }}
            >
              <Save size={12} />
              <span style={{ fontSize: "11px", fontWeight: 600 }}>Save</span>
            </button>

            {/* Typewriter Mode Toggle */}
            <button
              type="button"
              data-ocid="create.typewriter.toggle"
              onClick={toggleTypewriterMode}
              title={
                typewriterMode
                  ? "Typewriter Mode ON (click to disable)"
                  : "Typewriter Mode OFF (click to enable)"
              }
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                background: typewriterMode ? "rgba(34,197,94,0.15)" : toolbarBg,
                border: typewriterMode
                  ? "1px solid rgba(34,197,94,0.5)"
                  : toolbarBorder,
                color: typewriterMode ? "#22C55E" : toolbarColor,
              }}
            >
              <AlignCenter size={12} />
              <span style={{ fontSize: "11px", fontWeight: 600 }}>TW</span>
            </button>

            {/* Import */}
            <button
              type="button"
              data-ocid="create.import.button"
              onClick={() => importFileRef.current?.click()}
              title="Import file (.txt, .fountain)"
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg transition-all duration-200 cursor-pointer"
              style={{
                background: toolbarBg,
                border: toolbarBorder,
                color: toolbarColor,
              }}
            >
              <Upload size={12} />
              <span style={{ fontSize: "11px", fontWeight: 600 }}>Import</span>
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".txt,.fountain,.fdx,.md"
              style={{ display: "none" }}
              onChange={handleImportFile}
            />
          </div>

          {/* Editor container — Feature 4: novel scrolls inside, toolbar stays sticky above */}
          <div
            className="flex flex-col flex-1 rounded-xl"
            style={{
              background: editorBg,
              border: editorBorder,
              minHeight: "380px",
              position: "relative",
              // For novel: overflow must NOT be on this container so sticky works
              overflow: project.type === "Novel" ? "hidden" : undefined,
            }}
          >
            {project.type === "Novel" ? (
              // ── NOVEL: scrollable container with contentEditable inside ──────
              <div
                ref={novelScrollContainerRef}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  position: "relative",
                  minHeight: "380px",
                }}
              >
                <div
                  ref={novelEditorRef}
                  data-ocid="create.editor"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => {
                    const html = e.currentTarget.innerHTML;
                    setSaveStatus("Unsaved changes");
                    if (saveTimer.current) clearTimeout(saveTimer.current);
                    void html;

                    // ── Feature 6: parse current line for character/place names ──
                    const sel = window.getSelection();
                    const anchorNode = sel?.anchorNode ?? null;
                    if (anchorNode) {
                      let lineNode: Node | null = anchorNode;
                      while (
                        lineNode &&
                        lineNode !== e.currentTarget &&
                        lineNode.nodeType !== Node.ELEMENT_NODE
                      ) {
                        lineNode = lineNode.parentNode;
                      }
                      const lineText =
                        lineNode && lineNode !== e.currentTarget
                          ? ((lineNode as HTMLElement).innerText?.trim() ?? "")
                          : "";

                      // Detect INT./EXT. scene headings for place memory
                      const upperLine = lineText.toUpperCase();
                      if (/^(INT\.|EXT\.|INT |EXT )/.test(upperLine)) {
                        const placeMatch = lineText
                          .replace(/^(INT\.|EXT\.|INT |EXT )\s*/i, "")
                          .split(/[-–]/)[0]
                          .trim()
                          .toUpperCase();
                        if (placeMatch.length > 2) {
                          setNovelPlaceNames((prev) =>
                            prev.includes(placeMatch)
                              ? prev
                              : [placeMatch, ...prev].slice(0, 20),
                          );
                        }
                        // Show place suggestions when typing INT./EXT.
                        const partialPlace = lineText
                          .replace(/^(INT\.|EXT\.|INT |EXT )\s*/i, "")
                          .trim()
                          .toUpperCase();
                        const filtered = novelPlaceNames.filter(
                          (p) => !partialPlace || p.includes(partialPlace),
                        );
                        if (filtered.length > 0) {
                          novelSuggestionMode.current = "place";
                          setNovelSuggestions(filtered);
                        } else {
                          novelSuggestionMode.current = null;
                          setNovelSuggestions([]);
                        }
                      } else if (
                        lineText === lineText.toUpperCase() &&
                        lineText.length > 1 &&
                        /^[A-Z]/.test(lineText)
                      ) {
                        // ALL CAPS line — likely a character name
                        setNovelCharNames((prev) =>
                          prev.includes(lineText)
                            ? prev
                            : [lineText, ...prev].slice(0, 30),
                        );
                        const filtered = novelCharNames.filter(
                          (n) => !lineText || n.startsWith(lineText),
                        );
                        if (filtered.length > 0 && lineText.length >= 2) {
                          novelSuggestionMode.current = "char";
                          setNovelSuggestions(filtered);
                        } else {
                          novelSuggestionMode.current = null;
                          setNovelSuggestions([]);
                        }
                      } else {
                        novelSuggestionMode.current = null;
                        setNovelSuggestions([]);
                      }
                    }

                    // ── Feature 5: Typewriter mode for novel ──────────────────
                    if (typewriterMode) {
                      requestAnimationFrame(() => {
                        const curSel = window.getSelection();
                        if (curSel && curSel.rangeCount > 0) {
                          const range = curSel.getRangeAt(0);
                          const rect = range.getBoundingClientRect();
                          if (rect.height > 0) {
                            const target = window.innerHeight * 0.45;
                            const currentTop = rect.top;
                            if (currentTop > target) {
                              const delta = currentTop - target;
                              window.scrollBy({
                                top: delta,
                                behavior: "smooth",
                              });
                            }
                          }
                        }
                      });
                    }
                  }}
                  onMouseUp={handleNovelMouseUp}
                  onMouseDown={() =>
                    setSelectionToolbar((prev) => ({ ...prev, visible: false }))
                  }
                  onKeyDown={(e) => {
                    // Close suggestions on Escape
                    if (e.key === "Escape") {
                      setNovelSuggestions([]);
                      novelSuggestionMode.current = null;
                    }
                    // Clear suggestions on line-breaking keys
                    if (e.key === "Enter") {
                      setNovelSuggestions([]);
                      novelSuggestionMode.current = null;
                    }
                  }}
                  data-placeholder="Begin your story..."
                  className="w-full flex-1 outline-none p-4"
                  style={{
                    fontFamily: editorFont,
                    fontSize: `${fontSize}px`,
                    lineHeight: "1.7",
                    minHeight: "380px",
                    color: isDay ? "#1a1a1a" : "#e0e0e0",
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                  spellCheck={false}
                />

                {/* Novel character/place suggestions dropdown */}
                {novelSuggestions.length > 0 && (
                  <div
                    data-ocid="create.novel_suggestions.popover"
                    style={{
                      position: "sticky",
                      bottom: "8px",
                      left: "16px",
                      marginLeft: "16px",
                      display: "inline-block",
                      background: isDay
                        ? "rgba(240,235,220,0.97)"
                        : "rgba(15,15,15,0.97)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      zIndex: 50,
                      minWidth: "200px",
                      maxWidth: "320px",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    }}
                  >
                    <div
                      style={{
                        padding: "6px 12px 4px",
                        fontSize: "10px",
                        color: "#6B7280",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {novelSuggestionMode.current === "place"
                        ? "Places"
                        : "Characters"}{" "}
                      — click to insert
                    </div>
                    {novelSuggestions.slice(0, 6).map((name) => (
                      <button
                        key={name}
                        type="button"
                        data-ocid="create.novel_suggestion.button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          // Insert the suggestion into the editor
                          const editorEl = novelEditorRef.current;
                          if (!editorEl) return;
                          editorEl.focus();
                          const sel = window.getSelection();
                          if (sel && sel.rangeCount > 0) {
                            const range = sel.getRangeAt(0);
                            // Select to start of current line text after INT./EXT. prefix
                            const anchorNode = sel.anchorNode;
                            if (anchorNode) {
                              const nodeText = anchorNode.textContent ?? "";
                              const prefixMatch = nodeText.match(
                                /^(INT\.|EXT\.|INT |EXT )\s*/i,
                              );
                              const offset = prefixMatch
                                ? prefixMatch[0].length
                                : 0;
                              try {
                                range.setStart(anchorNode, offset);
                                range.setEnd(anchorNode, nodeText.length);
                                range.deleteContents();
                                range.insertNode(document.createTextNode(name));
                                range.collapse(false);
                                sel.removeAllRanges();
                                sel.addRange(range);
                              } catch (_e) {
                                execCmd("insertText", name);
                              }
                            }
                          }
                          setNovelSuggestions([]);
                          novelSuggestionMode.current = null;
                        }}
                        className="w-full text-left px-3 py-2 text-sm font-bold cursor-pointer transition-colors"
                        style={{
                          fontFamily: "'Courier New', Courier, monospace",
                          color: isDay ? "#1a1a1a" : "#f5f5f5",
                          letterSpacing: "0.08em",
                          background: "transparent",
                          textTransform: "uppercase",
                          border: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(34,197,94,0.12)";
                          e.currentTarget.style.color = "#22C55E";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = isDay
                            ? "#1a1a1a"
                            : "#f5f5f5";
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // ── SCREENPLAY: line-based editor ──────────────────────────────
              <div
                data-ocid="create.editor"
                style={{
                  flex: 1,
                  padding: "16px",
                  minHeight: "380px",
                  position: "relative",
                  fontFamily: editorFont,
                  fontSize: `${fontSize}px`,
                  lineHeight: "1.75",
                }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target === e.currentTarget) {
                    const last = engine.lines[engine.lines.length - 1];
                    if (last) engine.focusLine(last.id, true);
                  }
                }}
                onKeyDown={() => {}}
                onKeyDownCapture={handleEditorKeyDownCapture}
              >
                {engine.lines.map((line) => (
                  <ScreenplayLine
                    key={line.id}
                    lineId={line.id}
                    lineType={line.type}
                    lineText={line.text}
                    isActive={engine.activeLineId === line.id}
                    isDay={isDay}
                    fontSize={fontSize}
                    editorFont={editorFont}
                    lineRefs={engine.lineRefs}
                    isProgrammaticUpdateRef={engine.isProgrammaticUpdateRef}
                    onFocus={() => engine.setActiveLineId(line.id)}
                    onInput={(text) => engine.setLineText(line.id, text)}
                    onKeyDown={(e) => engine.handleLineKeyDown(line.id, e)}
                  />
                ))}

                {/* Character suggestion dropdown */}
                {engine.charSuggestions.length > 0 && (
                  <div
                    data-ocid="create.char_suggestions.popover"
                    style={{
                      position: "absolute",
                      bottom: "8px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: isDay
                        ? "rgba(240,235,220,0.97)"
                        : "rgba(15,15,15,0.97)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      zIndex: 50,
                      minWidth: "200px",
                      maxWidth: "300px",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    }}
                  >
                    <div
                      style={{
                        padding: "6px 12px 4px",
                        fontSize: "10px",
                        color: "#6B7280",
                        letterSpacing: "0.06em",
                      }}
                    >
                      TAB to fill
                    </div>
                    {engine.charSuggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        data-ocid="create.char_suggestion.button"
                        onClick={() => engine.acceptCharSuggestion(name)}
                        className="w-full text-left px-3 py-2 text-sm font-bold cursor-pointer transition-colors"
                        style={{
                          fontFamily: "'Courier New', Courier, monospace",
                          color: isDay ? "#1a1a1a" : "#f5f5f5",
                          letterSpacing: "0.08em",
                          background: "transparent",
                          textTransform: "uppercase",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(34,197,94,0.12)";
                          e.currentTarget.style.color = "#22C55E";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = isDay
                            ? "#1a1a1a"
                            : "#f5f5f5";
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Scene heading suggestion dropdown */}
                {engine.sceneSuggestions &&
                  engine.sceneSuggestions.length > 0 && (
                    <div
                      data-ocid="create.scene_suggestions.popover"
                      style={{
                        position: "absolute",
                        top: "60px",
                        left: "8px",
                        background: isDay
                          ? "rgba(240,235,220,0.97)"
                          : "rgba(15,15,15,0.97)",
                        border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "12px",
                        overflow: "hidden",
                        zIndex: 50,
                        minWidth: "280px",
                        maxWidth: "380px",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                      }}
                    >
                      <div
                        style={{
                          padding: "6px 12px 4px",
                          fontSize: "10px",
                          color: "#6B7280",
                          letterSpacing: "0.06em",
                        }}
                      >
                        TAB to fill scene
                      </div>
                      {engine.sceneSuggestions.map((scene) => (
                        <button
                          key={scene}
                          type="button"
                          data-ocid="create.scene_suggestion.button"
                          onClick={() => engine.acceptSceneSuggestion(scene)}
                          className="w-full text-left px-3 py-2 text-xs font-bold cursor-pointer transition-colors"
                          style={{
                            fontFamily: "'Courier New', Courier, monospace",
                            color: isDay ? "#1a1a1a" : "#f5f5f5",
                            letterSpacing: "0.05em",
                            background: "transparent",
                            textTransform: "uppercase",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "rgba(34,197,94,0.12)";
                            e.currentTarget.style.color = "#22C55E";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = isDay
                              ? "#1a1a1a"
                              : "#f5f5f5";
                          }}
                        >
                          {scene}
                        </button>
                      ))}
                    </div>
                  )}

                {/* Command palette */}
                {engine.commandPalette.open && (
                  <div
                    data-ocid="create.command_palette.popover"
                    style={{
                      position: "absolute",
                      top: "60px",
                      left: "16px",
                      background: isDay
                        ? "rgba(240,235,220,0.97)"
                        : "rgba(15,15,15,0.97)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      overflow: "hidden",
                      zIndex: 50,
                      minWidth: "240px",
                      maxWidth: "320px",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px 6px",
                        fontSize: "10px",
                        color: "#6B7280",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      Commands
                    </div>
                    {engine.commandPalette.options.length === 0 ? (
                      <div
                        style={{
                          padding: "12px",
                          fontSize: "12px",
                          color: "#6B7280",
                        }}
                      >
                        No matching commands
                      </div>
                    ) : (
                      engine.commandPalette.options.map((opt) => (
                        <button
                          key={opt.action}
                          type="button"
                          data-ocid="create.command_palette.button"
                          onClick={() => engine.handleCommandSelect(opt.action)}
                          className="w-full text-left px-3 py-2.5 text-sm cursor-pointer transition-colors"
                          style={{
                            fontFamily: editorFont,
                            color: isDay ? "#1a1a1a" : "#d4d4d4",
                            background: "transparent",
                            fontSize: "12px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "rgba(34,197,94,0.12)";
                            e.currentTarget.style.color = "#22C55E";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = isDay
                              ? "#1a1a1a"
                              : "#d4d4d4";
                          }}
                        >
                          {opt.label}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Novel floating bold/italic toolbar */}
            {project.type === "Novel" && selectionToolbar.visible && (
              <div
                data-ocid="create.selection_toolbar.popover"
                style={{
                  position: "absolute",
                  top: `${selectionToolbar.y}px`,
                  left: `${selectionToolbar.x}px`,
                  display: "flex",
                  gap: "4px",
                  background: isDay
                    ? "rgba(240,235,220,0.97)"
                    : "rgba(15,15,15,0.97)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: "8px",
                  padding: "4px",
                  zIndex: 60,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  pointerEvents: "auto",
                }}
              >
                {(
                  [
                    {
                      id: "bold",
                      title: "Bold",
                      cmd: "bold",
                      fw: 800,
                      fi: "normal" as const,
                    },
                    {
                      id: "italic",
                      title: "Italic",
                      cmd: "italic",
                      fw: 600,
                      fi: "italic" as const,
                    },
                    {
                      id: "underline",
                      title: "Underline",
                      cmd: "underline",
                      fw: 600,
                      fi: "normal" as const,
                    },
                    {
                      id: "strike",
                      title: "Strikethrough",
                      cmd: "strikeThrough",
                      fw: 600,
                      fi: "normal" as const,
                    },
                  ] as const
                ).map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    data-ocid={`create.${btn.id}.button`}
                    title={btn.title}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applySelectionFormat(btn.cmd);
                    }}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "5px",
                      background: "transparent",
                      border: "none",
                      color: isDay ? "#1a1a1a" : "#f5f5f5",
                      fontWeight: btn.fw,
                      fontStyle: btn.fi,
                      fontSize: "13px",
                      cursor: "pointer",
                      textDecoration:
                        btn.id === "underline"
                          ? "underline"
                          : btn.id === "strike"
                            ? "line-through"
                            : "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(34,197,94,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {btn.id === "bold"
                      ? "B"
                      : btn.id === "italic"
                        ? "I"
                        : btn.id === "underline"
                          ? "U"
                          : "S\u0336"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // ── OUTLINE TAB ──────────────────────────────────────────────────────────
        <div className="flex flex-col flex-1 px-4 pt-4 gap-4">
          <div className="flex gap-2">
            <input
              data-ocid="create.scene_title.input"
              type="text"
              value={newSceneTitle}
              onChange={(e) => setNewSceneTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddScene()}
              placeholder="Add a scene..."
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: isDay
                  ? "rgba(255,255,255,0.7)"
                  : "rgba(255,255,255,0.05)",
                border: isDay
                  ? "1px solid rgba(0,0,0,0.1)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: titleColor,
                fontFamily: "'Courier New', Courier, monospace",
              }}
            />
            <button
              type="button"
              data-ocid="create.add_scene.button"
              onClick={handleAddScene}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex-shrink-0"
              style={{
                background: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#22C55E",
                opacity: newSceneTitle.trim() ? 1 : 0.5,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(34,197,94,0.25)";
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(34,197,94,0.15)";
                e.currentTarget.style.opacity = newSceneTitle.trim()
                  ? "1"
                  : "0.5";
              }}
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {scenes.length === 0 ? (
            <div
              data-ocid="create.outline.empty_state"
              className="text-center py-16"
            >
              <p
                className="font-semibold mb-1"
                style={{ color: isDay ? "#888" : "#6B7280" }}
              >
                No scenes yet
              </p>
              <p
                className="text-sm"
                style={{ color: isDay ? "#aaa" : "#4B5563" }}
              >
                Start writing to auto-detect sluglines, or add scenes manually
                above.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {scenes.map((scene, idx) => (
                <div
                  key={scene.id}
                  data-ocid={`create.scene.item.${idx + 1}`}
                  className="flex items-center gap-3 p-4 rounded-xl group"
                  style={{
                    background: isDay
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(12,12,12,0.9)",
                    border: isDay
                      ? "1px solid rgba(0,0,0,0.08)"
                      : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <GripVertical
                    size={16}
                    style={{ color: "#4B5563" }}
                    className="flex-shrink-0 cursor-grab"
                  />
                  <div
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: "rgba(34,197,94,0.15)",
                      color: "#22C55E",
                    }}
                  >
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={scene.title}
                    onChange={(e) =>
                      handleSceneTitleChange(scene.id, e.target.value)
                    }
                    className="flex-1 bg-transparent text-sm font-medium outline-none"
                    style={{
                      fontFamily: "'Courier New', Courier, monospace",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: titleColor,
                    }}
                  />
                  <button
                    type="button"
                    data-ocid={`create.scene.delete_button.${idx + 1}`}
                    onClick={() => handleDeleteScene(scene.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-200 cursor-pointer"
                    style={{ color: "#6B7280" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#6B7280";
                    }}
                    aria-label="Delete scene"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Selection Dropdown Backdrop ──────────────────────────────────── */}
      {selDropdownOpen && (
        <div
          role="button"
          tabIndex={-1}
          onClick={() => {
            setSelDropdownOpen(false);
            setPendingMode(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setSelDropdownOpen(false);
              setPendingMode(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "rgba(0,0,0,0.5)",
          }}
        />
      )}

      {/* ─── Selection Dropdown ──────────────────────────────────────────────── */}
      {selDropdownOpen && pendingMode && (
        <div
          data-ocid="create.selection_helper.dialog"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#111",
            border: "1px solid rgba(0,255,120,0.3)",
            borderRadius: "8px",
            zIndex: 1000,
            minWidth: "220px",
            padding: "8px 0",
            boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              color: "rgba(255,255,255,0.5)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {pendingMode === "transition"
              ? "Select Transition"
              : pendingMode === "shot"
                ? "Select Shot"
                : "Select VO Type"}
          </div>
          {(pendingMode === "transition"
            ? TRANSITIONS_LIST
            : pendingMode === "shot"
              ? SHOT_TYPES_LIST
              : VO_TYPES_LIST
          ).map((item) => (
            <button
              key={item}
              type="button"
              data-ocid="create.selection_helper.button"
              onClick={() => handleSelectionInsert(item)}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                color: "#fff",
                padding: "8px 16px",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "Courier New, monospace",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0,255,120,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            data-ocid="create.selection_helper.cancel_button"
            onClick={() => {
              setSelDropdownOpen(false);
              setPendingMode(null);
            }}
            style={{
              display: "block",
              width: "100%",
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.3)",
              padding: "8px 16px",
              textAlign: "left",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
