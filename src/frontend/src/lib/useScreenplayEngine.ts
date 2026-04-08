import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LineType =
  | "scene-heading"
  | "action"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "transition"
  | "shot";

export interface ScriptLine {
  id: string;
  type: LineType;
  text: string;
  manualOverride: boolean;
}

interface HistorySnapshot {
  lines: ScriptLine[];
  activeLineId: string | null;
}

interface CommandOption {
  label: string;
  action: string;
}

interface CommandPaletteState {
  open: boolean;
  query: string;
  options: CommandOption[];
}

export interface ScreenplayEngineResult {
  lines: ScriptLine[];
  activeLineId: string | null;
  setActiveLineId: (id: string | null) => void;
  setLineText: (id: string, text: string) => void;
  setLineType: (id: string, type: LineType) => void;
  handleLineKeyDown: (
    id: string,
    e: React.KeyboardEvent<HTMLDivElement>,
  ) => void;
  serializedValue: string;
  undo: () => void;
  redo: () => void;
  charSuggestions: string[];
  sceneSuggestions: string[];
  acceptCharSuggestion: (name: string) => void;
  acceptSceneSuggestion: (scene: string) => void;
  commandPalette: CommandPaletteState;
  handleCommandSelect: (action: string) => void;
  dismissCommandPalette: () => void;
  focusLine: (id: string, atEnd?: boolean) => void;
  lineRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  isProgrammaticUpdateRef: React.MutableRefObject<Set<string>>;
  insertVOOnCharacter: (id: string, voSuffix: string) => void;
  // Legacy compat for Novel mode
  value: string;
  insertText: (newVal: string, cursorPos: number) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  activeFormat: LineType;
  resetToValue: (newValue: string) => void;
  replaceAllContent: (text: string) => void;
}

interface UseScreenplayEngineOptions {
  initialValue: string;
  onContentChange?: (newValue: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_COMMANDS: CommandOption[] = [
  { label: "/scene → Scene Heading (INT./EXT.)", action: "scene" },
  { label: "/char → Character Name", action: "char" },
  { label: "/dialogue → Dialogue Block", action: "dialogue" },
  { label: "/action → Action Line", action: "action" },
  { label: "/paren → Parenthetical", action: "paren" },
  { label: "/cut → CUT TO:", action: "cut" },
  { label: "/transition → FADE OUT.", action: "transition" },
];

const SHORTCUT_MAP: Record<string, { text: string; type: LineType }> = {
  int: { text: "INT. ", type: "scene-heading" },
  ext: { text: "EXT. ", type: "scene-heading" },
  cu: { text: "CUT TO:", type: "transition" },
  fs: { text: "FADE IN:", type: "transition" },
  fe: { text: "FADE OUT.", type: "transition" },
};

// Known shot prefixes for detection
const SHOT_PREFIXES = [
  "CLOSE UP",
  "ECU",
  "EXTREME CLOSE UP",
  "MEDIUM SHOT",
  "LONG SHOT",
  "OVER THE SHOULDER",
  "POV SHOT",
  "WIDE SHOT",
  "TRACKING SHOT",
  "PAN SHOT",
  "TILT SHOT",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

let idCounter = 0;
function genId(): string {
  return `line_${Date.now()}_${++idCounter}`;
}

function detectLineType(text: string): LineType {
  const trimmed = text.trim();
  const upper = trimmed.toUpperCase();
  if (
    upper.startsWith("INT.") ||
    upper.startsWith("EXT.") ||
    upper === "INT" ||
    upper === "EXT" ||
    upper.startsWith("INT ") ||
    upper.startsWith("EXT ")
  ) {
    return "scene-heading";
  }
  if (trimmed.startsWith("(")) {
    return "parenthetical";
  }
  if (
    upper === "CUT TO:" ||
    upper === "FADE IN:" ||
    upper === "FADE OUT." ||
    upper === "FADE TO:" ||
    upper === "SMASH CUT TO:" ||
    upper === "MATCH CUT TO:" ||
    (upper.endsWith("TO:") && trimmed.split(" ").length <= 3)
  ) {
    return "transition";
  }
  // Shot detection
  for (const prefix of SHOT_PREFIXES) {
    if (upper.startsWith(prefix)) {
      return "shot";
    }
  }
  return "action";
}

function parseInitialValue(text: string): ScriptLine[] {
  if (!text.trim()) {
    return [{ id: genId(), type: "action", text: "", manualOverride: false }];
  }
  const rawLines = text.split("\n");
  const lines: ScriptLine[] = [];
  let prevType: LineType = "action";

  for (let i = 0; i < rawLines.length; i++) {
    const rawText = rawLines[i];
    let type = detectLineType(rawText);

    // Heuristic: line following a character line that is non-empty is dialogue
    if (
      type === "action" &&
      prevType === "character" &&
      rawText.trim() !== ""
    ) {
      type = "dialogue";
    }
    // All-caps line of 1-4 words not starting INT/EXT is likely a character name
    if (
      type === "action" &&
      rawText.trim() !== "" &&
      rawText.trim() === rawText.trim().toUpperCase() &&
      rawText.trim().split(/\s+/).length <= 4 &&
      !rawText.trim().startsWith("(") &&
      prevType !== "character"
    ) {
      type = "character";
    }

    lines.push({ id: genId(), type, text: rawText, manualOverride: false });
    prevType = type;
  }

  return lines.length > 0
    ? lines
    : [{ id: genId(), type: "action", text: "", manualOverride: false }];
}

export function placeCaretAtEnd(el: HTMLDivElement) {
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function placeCaretAtStart(el: HTMLDivElement) {
  el.focus();
  const range = document.createRange();
  range.setStart(el, 0);
  range.collapse(true);
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export function placeCaretAtOffset(el: HTMLDivElement, offset: number) {
  el.focus();
  const textNode = el.firstChild;
  if (textNode && textNode.nodeType === Node.TEXT_NODE) {
    const safeOffset = Math.min(offset, textNode.textContent?.length ?? 0);
    const range = document.createRange();
    range.setStart(textNode, safeOffset);
    range.collapse(true);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } else {
    placeCaretAtEnd(el);
  }
}

export function getCaretOffset(el: HTMLDivElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preRange = document.createRange();
  preRange.setStart(el, 0);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useScreenplayEngine(
  options: UseScreenplayEngineOptions,
): ScreenplayEngineResult {
  const { initialValue, onContentChange } = options;

  const [lines, setLines] = useState<ScriptLine[]>(() =>
    parseInitialValue(initialValue),
  );
  const [activeLineId, setActiveLineIdState] = useState<string | null>(
    () => lines[0]?.id ?? null,
  );
  const [characters, setCharacters] = useState<Set<string>>(new Set());
  const [sceneHeadings, setSceneHeadings] = useState<Set<string>>(new Set());
  const [charSuggestions, setCharSuggestions] = useState<string[]>([]);
  const [sceneSuggestions, setSceneSuggestions] = useState<string[]>([]);
  const [commandPalette, setCommandPalette] = useState<CommandPaletteState>({
    open: false,
    query: "",
    options: ALL_COMMANDS,
  });

  // Shared refs for DOM manipulation
  const lineRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isProgrammaticUpdateRef = useRef<Set<string>>(new Set());

  // History stack — use refs so we never cause re-renders from history ops
  const historyRef = useRef<HistorySnapshot[]>([
    { lines, activeLineId: lines[0]?.id ?? null },
  ]);
  const historyIndexRef = useRef(0);
  // Track last push time to batch rapid keystrokes
  const lastHistoryPushRef = useRef<number>(Date.now());
  const lastEnterTimeRef = useRef<number>(0);

  // Legacy Novel mode refs
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [novelValue, setNovelValue] = useState(initialValue);
  const novelHistoryRef = useRef<{ value: string; cursor: number }[]>([
    { value: initialValue, cursor: 0 },
  ]);
  const novelHistoryIdxRef = useRef(0);
  const pendingNovelCursorRef = useRef<number | null>(null);

  // ─── Derived ──────────────────────────────────────────────────────────
  const serializedValue = lines.map((l) => l.text).join("\n");
  const activeLine = lines.find((l) => l.id === activeLineId) ?? null;
  const activeFormat: LineType = activeLine?.type ?? "action";

  // ─── Sync initialValue ONLY when projectId changes (via externalReset) ──
  // We do NOT watch initialValue directly — that causes the reset-on-type bug.
  // Instead, CreateScreen calls engine.resetToValue(newContent) when switching projects.
  // The engineResetKey below is driven by project.id.
  const [engineResetKey, setEngineResetKey] = useState(0);
  const engineResetValueRef = useRef(initialValue);

  const resetToValue = useCallback((newValue: string) => {
    engineResetValueRef.current = newValue;
    setEngineResetKey((k) => k + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset trigger
  useEffect(() => {
    const newValue = engineResetValueRef.current;
    const parsed = parseInitialValue(newValue);
    for (const l of parsed) isProgrammaticUpdateRef.current.add(l.id);
    setLines(parsed);
    setNovelValue(newValue);
    const firstId = parsed[0]?.id ?? null;
    setActiveLineIdState(firstId);
    historyRef.current = [{ lines: parsed, activeLineId: firstId }];
    historyIndexRef.current = 0;
    lastHistoryPushRef.current = Date.now();
    novelHistoryRef.current = [{ value: newValue, cursor: 0 }];
    novelHistoryIdxRef.current = 0;
    // Rebuild character and scene memory from loaded content
    const chars = new Set<string>();
    const scenes = new Set<string>();
    for (const line of parsed) {
      if (line.type === "character" && line.text.trim())
        chars.add(line.text.trim().toUpperCase());
      if (line.type === "scene-heading" && line.text.trim())
        scenes.add(line.text.trim().toUpperCase());
    }
    setCharacters(chars);
    setSceneHeadings(scenes);
  }, [engineResetKey]);

  // Novel mode: apply pending cursor
  useEffect(() => {
    if (pendingNovelCursorRef.current !== null) {
      const pos = pendingNovelCursorRef.current;
      pendingNovelCursorRef.current = null;
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(pos, pos);
        }
      });
    }
  });

  // ─── History ──────────────────────────────────────────────────────────
  const pushHistory = useCallback(
    (newLines: ScriptLine[], newActiveId: string | null, force = false) => {
      const now = Date.now();
      const timeSinceLast = now - lastHistoryPushRef.current;
      // Batch rapid keystrokes: only push if >600ms since last push OR forced
      if (!force && timeSinceLast < 600) {
        // Still update the current snapshot so undo goes back to the right place
        const stack = historyRef.current;
        const idx = historyIndexRef.current;
        stack[idx] = { lines: newLines, activeLineId: newActiveId };
        return;
      }
      lastHistoryPushRef.current = now;
      const stack = historyRef.current;
      const idx = historyIndexRef.current;
      const truncated = stack.slice(0, idx + 1);
      truncated.push({ lines: newLines, activeLineId: newActiveId });
      if (truncated.length > 200) truncated.shift();
      historyRef.current = truncated;
      historyIndexRef.current = truncated.length - 1;
    },
    [],
  );

  // ─── Focus utilities ──────────────────────────────────────────────────
  const focusLine = useCallback((id: string, atEnd = true) => {
    requestAnimationFrame(() => {
      const el = lineRefs.current.get(id);
      if (!el) return;
      if (atEnd) placeCaretAtEnd(el);
      else placeCaretAtStart(el);
    });
  }, []);

  // ─── setActiveLineId ───────────────────────────────────────────────
  const setActiveLineId = useCallback((id: string | null) => {
    setActiveLineIdState(id);
    if (id) {
      setCharSuggestions([]);
      setSceneSuggestions([]);
    }
  }, []);

  // ─── Notify content change ──────────────────────────────────────────
  const notifyChange = useCallback(
    (newLines: ScriptLine[]) => {
      onContentChange?.(newLines.map((l) => l.text).join("\n"));
    },
    [onContentChange],
  );

  // ─── setLineText ─────────────────────────────────────────────────────
  const setLineText = useCallback(
    (id: string, text: string) => {
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx === -1) return prev;
        const line = prev[idx];

        let newType = line.type;
        if (!line.manualOverride) {
          const detected = detectLineType(text);
          if (detected !== "action") {
            newType = detected;
          } else if (
            line.type === "scene-heading" &&
            !text.trim().toUpperCase().startsWith("INT") &&
            !text.trim().toUpperCase().startsWith("EXT")
          ) {
            newType = "action";
          } else {
            newType = line.type;
          }
        }

        let finalText = text;
        if (newType === "scene-heading" || line.type === "scene-heading") {
          finalText = text.toUpperCase();
          if (finalText !== text) {
            isProgrammaticUpdateRef.current.add(id);
          }
        } else if (newType === "character" || line.type === "character") {
          finalText = text.toUpperCase();
          if (finalText !== text) {
            isProgrammaticUpdateRef.current.add(id);
          }
        } else if (newType === "transition" || line.type === "transition") {
          finalText = text.toUpperCase();
          if (finalText !== text) {
            isProgrammaticUpdateRef.current.add(id);
          }
        } else if (newType === "shot" || line.type === "shot") {
          finalText = text.toUpperCase();
          if (finalText !== text) {
            isProgrammaticUpdateRef.current.add(id);
          }
        }

        const newLine = { ...line, text: finalText, type: newType };
        const newLines = [...prev];
        newLines[idx] = newLine;
        // Push to history with batching
        pushHistory(newLines, id, false);
        return newLines;
      });
    },
    [pushHistory],
  );

  // ─── Character suggestions ─────────────────────────────────────────────
  useEffect(() => {
    if (!activeLineId) {
      setCharSuggestions([]);
      return;
    }
    const line = lines.find((l) => l.id === activeLineId);
    if (!line || line.type !== "character") {
      setCharSuggestions([]);
      return;
    }
    const query = line.text.trim().toUpperCase();
    if (!query) {
      setCharSuggestions([...characters].slice(0, 5));
      return;
    }
    const matches = [...characters].filter(
      (c) => c.startsWith(query) && c !== query,
    );
    setCharSuggestions(matches.slice(0, 5));
  }, [activeLineId, lines, characters]);

  // ─── Scene heading suggestions ─────────────────────────────────────────
  useEffect(() => {
    if (!activeLineId) {
      setSceneSuggestions([]);
      return;
    }
    const line = lines.find((l) => l.id === activeLineId);
    if (!line || line.type !== "scene-heading") {
      setSceneSuggestions([]);
      return;
    }
    const query = line.text.trim().toUpperCase();
    if (query.length < 3) {
      setSceneSuggestions([]);
      return;
    }
    const matches = [...sceneHeadings].filter(
      (s) => s.includes(query) && s !== query,
    );
    setSceneSuggestions(matches.slice(0, 5));
  }, [activeLineId, lines, sceneHeadings]);

  // ─── setLineType ─────────────────────────────────────────────────────
  const setLineType = useCallback(
    (id: string, type: LineType) => {
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx === -1) return prev;
        const line = prev[idx];
        let newText = line.text;
        if (
          type === "scene-heading" ||
          type === "character" ||
          type === "transition" ||
          type === "shot"
        ) {
          newText = line.text.toUpperCase();
        }
        if (type === "parenthetical" && !newText.startsWith("(")) {
          newText = `(${newText || ""})`;
        }
        const newLine = { ...line, type, text: newText, manualOverride: true };
        const newLines = [...prev];
        newLines[idx] = newLine;
        pushHistory(newLines, id, true);
        notifyChange(newLines);
        isProgrammaticUpdateRef.current.add(id);
        return newLines;
      });
    },
    [pushHistory, notifyChange],
  );

  // ─── insertVOOnCharacter ───────────────────────────────────────────────
  const insertVOOnCharacter = useCallback(
    (id: string, voSuffix: string) => {
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx === -1) return prev;
        const line = prev[idx];
        if (line.type !== "character") return prev;
        // Strip any existing VO suffix before adding new one
        const baseName = line.text.replace(/\s*\([^)]*\)\s*$/, "").trim();
        const newText = `${baseName} ${voSuffix}`.toUpperCase();
        const newLine = { ...line, text: newText, manualOverride: true };
        const newLines = [...prev];
        newLines[idx] = newLine;
        pushHistory(newLines, id, true);
        notifyChange(newLines);
        isProgrammaticUpdateRef.current.add(id);
        return newLines;
      });
      focusLine(id, true);
    },
    [pushHistory, notifyChange, focusLine],
  );

  // ─── dismissCommandPalette ──────────────────────────────────────────────
  const dismissCommandPalette = useCallback(() => {
    setCommandPalette((prev) => ({ ...prev, open: false, query: "" }));
  }, []);

  // ─── acceptCharSuggestion ───────────────────────────────────────────────
  const acceptCharSuggestion = useCallback(
    (name: string) => {
      if (!activeLineId) return;
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.id === activeLineId);
        if (idx === -1) return prev;
        const newLine = {
          ...prev[idx],
          text: name,
          type: "character" as LineType,
          manualOverride: true,
        };
        const newLines = [...prev];
        newLines[idx] = newLine;
        pushHistory(newLines, activeLineId, true);
        notifyChange(newLines);
        isProgrammaticUpdateRef.current.add(activeLineId);
        return newLines;
      });
      setCharSuggestions([]);
      focusLine(activeLineId, true);
    },
    [activeLineId, pushHistory, notifyChange, focusLine],
  );

  // ─── acceptSceneSuggestion ─────────────────────────────────────────────
  const acceptSceneSuggestion = useCallback(
    (scene: string) => {
      if (!activeLineId) return;
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.id === activeLineId);
        if (idx === -1) return prev;
        const newLine = {
          ...prev[idx],
          text: scene,
          type: "scene-heading" as LineType,
          manualOverride: true,
        };
        const newLines = [...prev];
        newLines[idx] = newLine;
        pushHistory(newLines, activeLineId, true);
        notifyChange(newLines);
        isProgrammaticUpdateRef.current.add(activeLineId);
        return newLines;
      });
      setSceneSuggestions([]);
      focusLine(activeLineId, true);
    },
    [activeLineId, pushHistory, notifyChange, focusLine],
  );

  // ─── handleCommandSelect ───────────────────────────────────────────────
  const handleCommandSelect = useCallback(
    (action: string) => {
      if (!activeLineId) return;
      let newType: LineType = "action";
      let newText = "";
      switch (action) {
        case "scene":
          newType = "scene-heading";
          newText = "INT. ";
          break;
        case "char":
          newType = "character";
          break;
        case "dialogue":
          newType = "dialogue";
          break;
        case "action":
          newType = "action";
          break;
        case "paren":
          newType = "parenthetical";
          newText = "(";
          break;
        case "cut":
          newType = "transition";
          newText = "CUT TO:";
          break;
        case "transition":
          newType = "transition";
          newText = "FADE OUT.";
          break;
        default:
          break;
      }
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.id === activeLineId);
        if (idx === -1) return prev;
        const newLine = {
          ...prev[idx],
          type: newType,
          text: newText,
          manualOverride: true,
        };
        const newLines = [...prev];
        newLines[idx] = newLine;
        pushHistory(newLines, activeLineId, true);
        notifyChange(newLines);
        isProgrammaticUpdateRef.current.add(activeLineId);
        return newLines;
      });
      dismissCommandPalette();
      focusLine(activeLineId, true);
    },
    [activeLineId, pushHistory, notifyChange, dismissCommandPalette, focusLine],
  );

  // ─── handleLineKeyDown ────────────────────────────────────────────────
  const handleLineKeyDown = useCallback(
    (id: string, e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = lineRefs.current.get(id);

      // ── Undo ────────────────────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const idx = historyIndexRef.current;
        if (idx > 0) {
          const snap = historyRef.current[idx - 1];
          historyIndexRef.current = idx - 1;
          for (const l of snap.lines) isProgrammaticUpdateRef.current.add(l.id);
          setLines(snap.lines);
          setActiveLineIdState(snap.activeLineId);
          if (snap.activeLineId) focusLine(snap.activeLineId, true);
          notifyChange(snap.lines);
        }
        return;
      }

      // ── Redo ────────────────────────────────────────────────────────────
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        const idx = historyIndexRef.current;
        const stack = historyRef.current;
        if (idx < stack.length - 1) {
          const snap = stack[idx + 1];
          historyIndexRef.current = idx + 1;
          for (const l of snap.lines) isProgrammaticUpdateRef.current.add(l.id);
          setLines(snap.lines);
          setActiveLineIdState(snap.activeLineId);
          if (snap.activeLineId) focusLine(snap.activeLineId, true);
          notifyChange(snap.lines);
        }
        return;
      }

      // ── Escape ───────────────────────────────────────────────────────────
      if (e.key === "Escape") {
        dismissCommandPalette();
        setCharSuggestions([]);
        setSceneSuggestions([]);
        return;
      }

      // ── Command palette Enter ───────────────────────────────────────────
      if (commandPalette.open && e.key === "Enter") {
        e.preventDefault();
        if (commandPalette.options.length > 0)
          handleCommandSelect(commandPalette.options[0].action);
        return;
      }

      // ── TAB: autofill character or scene suggestion ────────────────────
      if (e.key === "Tab") {
        e.preventDefault();
        const currentLine = lines.find((l) => l.id === id);
        if (currentLine?.type === "character" && charSuggestions.length > 0) {
          acceptCharSuggestion(charSuggestions[0]);
          return;
        }
        if (
          currentLine?.type === "scene-heading" &&
          sceneSuggestions.length > 0
        ) {
          acceptSceneSuggestion(sceneSuggestions[0]);
          return;
        }
        // TAB from action line → switch to character mode
        if (currentLine?.type === "action") {
          setLineType(id, "character");
          focusLine(id, true);
          return;
        }
        return;
      }

      const currentLine = lines.find((l) => l.id === id);
      if (!currentLine) return;

      // ── "(" auto-close ─────────────────────────────────────────────────
      if (e.key === "(") {
        e.preventDefault();
        if (!el) return;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);

        // Insert "()" at cursor
        const parenNode = document.createTextNode("()");
        range.deleteContents();
        range.insertNode(parenNode);

        // Move cursor between the parens
        range.setStart(parenNode, 1);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);

        // Sync engine state from DOM
        const newText = (el.innerText || el.textContent || "").replace(
          /\n$/,
          "",
        );
        setLines((prev) => {
          const newLines = prev.map((l) =>
            l.id === id ? { ...l, text: newText } : l,
          );
          pushHistory(newLines, id, true);
          notifyChange(newLines);
          return newLines;
        });
        return;
      }

      // ── SPACE: shortcut expansion ─────────────────────────────────────
      if (e.key === " ") {
        const currentText = (el?.innerText ?? "").trim().toLowerCase();
        const shortcut = SHORTCUT_MAP[currentText];
        if (shortcut) {
          e.preventDefault();
          setLines((prev) => {
            const newLines = prev.map((l) =>
              l.id === id
                ? {
                    ...l,
                    text: shortcut.text,
                    type: shortcut.type,
                    manualOverride: true,
                  }
                : l,
            );
            pushHistory(newLines, id, true);
            notifyChange(newLines);
            isProgrammaticUpdateRef.current.add(id);
            return newLines;
          });
          return;
        }
        // Word boundary: push history snapshot
        pushHistory(
          lines.map((l) =>
            l.id === id
              ? { ...l, text: el?.innerText.replace(/\n$/, "") ?? l.text }
              : l,
          ),
          id,
          true,
        );
      }

      // ── Dash in scene-heading → en-dash ──────────────────────────────
      if (e.key === "-" && currentLine.type === "scene-heading") {
        e.preventDefault();
        if (!el) return;
        const offset = getCaretOffset(el);
        const current = el.innerText;
        if (!current.slice(0, offset).endsWith(" \u2013 ")) {
          const newText =
            `${current.slice(0, offset)} – ${current.slice(offset)}`.toUpperCase();
          setLines((prev) => {
            const newLines = prev.map((l) =>
              l.id === id ? { ...l, text: newText } : l,
            );
            notifyChange(newLines);
            isProgrammaticUpdateRef.current.add(id);
            return newLines;
          });
          requestAnimationFrame(() => {
            const ref = lineRefs.current.get(id);
            if (ref) placeCaretAtOffset(ref, offset + 3);
          });
        }
        return;
      }

      // ── ENTER ──────────────────────────────────────────────────────────
      if (e.key === "Enter") {
        e.preventDefault();
        const lineText = (el?.innerText ?? "").trim();

        let nextType: LineType = "action";
        let nextText = "";
        let updatedCurrentText = lineText;
        const updatedCurrentType = currentLine.type;

        switch (currentLine.type) {
          case "scene-heading":
            updatedCurrentText = lineText.toUpperCase();
            // Save scene heading to memory
            if (lineText.trim()) {
              setSceneHeadings((prev) => {
                const next = new Set(prev);
                next.add(lineText.trim().toUpperCase());
                return next;
              });
            }
            nextType = "action";
            break;
          case "action": {
            const now = Date.now();
            const isDoubleEnter = now - lastEnterTimeRef.current < 300;
            lastEnterTimeRef.current = now;
            nextType = isDoubleEnter ? "character" : "action";
            break;
          }
          case "character":
            updatedCurrentText = lineText.toUpperCase();
            if (lineText) {
              setCharacters((prev) => {
                const next = new Set(prev);
                next.add(lineText.toUpperCase());
                return next;
              });
            }
            nextType = lineText === "" ? "action" : "dialogue";
            break;
          case "dialogue": {
            const now = Date.now();
            const isDoubleEnter = now - lastEnterTimeRef.current < 300;
            lastEnterTimeRef.current = now;
            nextType = isDoubleEnter ? "action" : "dialogue";
            break;
          }
          case "parenthetical":
            nextType = "dialogue";
            break;
          case "transition":
            updatedCurrentText = lineText.toUpperCase();
            nextType = "action";
            break;
          case "shot":
            updatedCurrentText = lineText.toUpperCase();
            nextType = "action";
            break;
          default:
            nextType = "action";
        }

        const newLineId = genId();
        setLines((prev) => {
          const idx = prev.findIndex((l) => l.id === id);
          if (idx === -1) return prev;
          const updatedCurrent = {
            ...prev[idx],
            text: updatedCurrentText,
            type: updatedCurrentType,
          };
          const newLine: ScriptLine = {
            id: newLineId,
            type: nextType,
            text: nextText,
            manualOverride: nextType === "character",
          };
          const newLines = [
            ...prev.slice(0, idx),
            updatedCurrent,
            newLine,
            ...prev.slice(idx + 1),
          ];
          pushHistory(newLines, newLineId, true);
          notifyChange(newLines);
          isProgrammaticUpdateRef.current.add(id);
          return newLines;
        });

        setActiveLineIdState(newLineId);
        focusLine(newLineId, false);
        return;
      }

      // ── BACKSPACE at caret position 0 ──────────────────────────────────
      if (e.key === "Backspace" && el) {
        const offset = getCaretOffset(el);
        const currentText = el.innerText;

        if (offset === 0) {
          e.preventDefault();
          const currentIdx = lines.findIndex((l) => l.id === id);
          if (currentIdx === 0) return;
          const prevLine = lines[currentIdx - 1];
          const prevId = prevLine.id;

          if (currentText === "") {
            // Delete empty line, focus prev at end
            const caretPos = prevLine.text.length;
            setLines((prev) => {
              const newLines = prev.filter((l) => l.id !== id);
              pushHistory(newLines, prevId, true);
              notifyChange(newLines);
              isProgrammaticUpdateRef.current.add(prevId);
              return newLines;
            });
            setActiveLineIdState(prevId);
            requestAnimationFrame(() => {
              const ref = lineRefs.current.get(prevId);
              if (ref) placeCaretAtOffset(ref, caretPos);
            });
          } else {
            // Merge current text into prev line
            const caretPos = prevLine.text.length;
            const mergedText = prevLine.text + currentText;
            setLines((prev) => {
              const newLines = prev
                .map((l) => (l.id === prevId ? { ...l, text: mergedText } : l))
                .filter((l) => l.id !== id);
              pushHistory(newLines, prevId, true);
              notifyChange(newLines);
              isProgrammaticUpdateRef.current.add(prevId);
              return newLines;
            });
            setActiveLineIdState(prevId);
            requestAnimationFrame(() => {
              const ref = lineRefs.current.get(prevId);
              if (ref) placeCaretAtOffset(ref, caretPos);
            });
          }
          return;
        }
      }

      // ── "/" at start of empty line ──────────────────────────────────────
      if (e.key === "/" && (el?.innerText ?? "").trim() === "") {
        setTimeout(() => {
          setCommandPalette({ open: true, query: "", options: ALL_COMMANDS });
        }, 0);
      }
    },
    [
      lines,
      charSuggestions,
      sceneSuggestions,
      commandPalette,
      acceptCharSuggestion,
      acceptSceneSuggestion,
      handleCommandSelect,
      dismissCommandPalette,
      setLineType,
      pushHistory,
      notifyChange,
      focusLine,
    ],
  );

  // ─── Toolbar Undo ──────────────────────────────────────────────────────
  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx > 0) {
      const snap = historyRef.current[idx - 1];
      historyIndexRef.current = idx - 1;
      for (const l of snap.lines) isProgrammaticUpdateRef.current.add(l.id);
      setLines(snap.lines);
      setActiveLineIdState(snap.activeLineId);
      if (snap.activeLineId) focusLine(snap.activeLineId, true);
      notifyChange(snap.lines);
    }
  }, [focusLine, notifyChange]);

  // ─── Toolbar Redo ──────────────────────────────────────────────────────
  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    const stack = historyRef.current;
    if (idx < stack.length - 1) {
      const snap = stack[idx + 1];
      historyIndexRef.current = idx + 1;
      for (const l of snap.lines) isProgrammaticUpdateRef.current.add(l.id);
      setLines(snap.lines);
      setActiveLineIdState(snap.activeLineId);
      if (snap.activeLineId) focusLine(snap.activeLineId, true);
      notifyChange(snap.lines);
    }
  }, [focusLine, notifyChange]);

  // ─── Legacy Novel helpers ──────────────────────────────────────────────
  const insertText = useCallback(
    (newVal: string, cursorPos: number) => {
      setNovelValue(newVal);
      pendingNovelCursorRef.current = cursorPos;
      novelHistoryRef.current = [
        ...novelHistoryRef.current.slice(0, novelHistoryIdxRef.current + 1),
        { value: newVal, cursor: cursorPos },
      ].slice(-200);
      novelHistoryIdxRef.current = novelHistoryRef.current.length - 1;
      onContentChange?.(newVal);
    },
    [onContentChange],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: setLines and setActiveLineId are stable setState functions
  const replaceAllContent = useCallback((text: string) => {
    const parsed = parseInitialValue(text);
    setLines(parsed);
    setActiveLineId(parsed[0]?.id ?? null);
  }, []);

  return {
    lines,
    activeLineId,
    setActiveLineId,
    setLineText,
    setLineType,
    handleLineKeyDown,
    serializedValue,
    undo,
    redo,
    charSuggestions,
    sceneSuggestions,
    acceptCharSuggestion,
    acceptSceneSuggestion,
    commandPalette,
    handleCommandSelect,
    dismissCommandPalette,
    focusLine,
    lineRefs,
    isProgrammaticUpdateRef,
    insertVOOnCharacter,
    value: novelValue,
    insertText,
    textareaRef,
    activeFormat,
    resetToValue,
    replaceAllContent,
  };
}
