import {
  BookMarked,
  Clapperboard,
  Cloud,
  Download,
  FileDown,
  FileText,
  Layers,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { GlobalHeader } from "./components/GlobalHeader";
import { NewProjectModal } from "./components/NewProjectModal";
import { dbDeleteProject } from "./lib/db";
import { queueProjectSync } from "./lib/offlineSync";
import {
  createProject,
  createSeries,
  loadProjects,
  loadSeries,
  migrateToIndexedDB,
  saveProject,
  saveProjects,
  saveSingleSeries,
} from "./lib/storage";
import { THEMES, applyTheme } from "./lib/themes";
import type { Project, ProjectType, Screen, Series } from "./lib/types";
import { CreateScreen } from "./screens/CreateScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { PlayScreen } from "./screens/PlayScreen";
import { SeriesScreen } from "./screens/SeriesScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [seriesList, setSeriesList] = useState<Series[]>(() => loadSeries());
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentSeries, setCurrentSeries] = useState<Series | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalDefaultType, setModalDefaultType] =
    useState<ProjectType>("Screenplay");
  const [showCreatePicker, setShowCreatePicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    return localStorage.getItem("writefy-theme") || "green";
  });
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [previousScreen, setPreviousScreen] = useState<Screen | null>(null);
  // Delete confirmation modal state
  const [deleteConfirmProject, setDeleteConfirmProject] =
    useState<Project | null>(null);
  const menuImportRef = useRef<HTMLInputElement | null>(null);

  // Migrate localStorage data to IndexedDB on first load
  useEffect(() => {
    void migrateToIndexedDB();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prompt = installPrompt as any;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  useEffect(() => {
    const savedId = localStorage.getItem("writefy-theme") || "green";
    const found = THEMES.find((t) => t.id === savedId);
    if (found) applyTheme(found);
    setActiveThemeId(savedId);
  }, []);

  const handleThemeChange = useCallback((themeId: string) => {
    const found = THEMES.find((t) => t.id === themeId);
    if (found) {
      applyTheme(found);
      setActiveThemeId(themeId);
    }
  }, []);

  const handleNavigate = useCallback((s: Screen) => {
    setScreen(s);
    setShowSettings(false);
  }, []);

  const handleOpenProject = useCallback((project: Project) => {
    setCurrentProject(project);
    setScreen("create");
  }, []);

  const handleOpenSeries = useCallback((s: Series) => {
    setCurrentSeries(s);
    setScreen("series");
  }, []);

  const handleSeriesUpdate = useCallback((updated: Series) => {
    setCurrentSeries(updated);
    setSeriesList((prev) => {
      const idx = prev.findIndex((s) => s.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });
  }, []);

  const handleProjectUpdate = useCallback((updated: Project) => {
    setCurrentProject(updated);
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });
  }, []);

  const handleCreateProject = useCallback(
    (title: string, type: ProjectType) => {
      if (type === "Series") return; // handled by handleCreateSeries
      const newProj = createProject(title, type as "Screenplay" | "Novel");
      saveProject(newProj);
      queueProjectSync(newProj.id);
      setProjects((prev) => [newProj, ...prev]);
      setCurrentProject(newProj);
      setScreen("create");
    },
    [],
  );

  const handleCreateSeries = useCallback(
    (title: string, description?: string) => {
      const newSeries = createSeries(title, description);
      saveSingleSeries(newSeries);
      setSeriesList((prev) => [newSeries, ...prev]);
      setCurrentSeries(newSeries);
      setScreen("series");
    },
    [],
  );

  const handleBackFromCreate = useCallback(() => {
    setPreviousScreen(null);
    setScreen("library");
  }, []);

  const handleBackFromSeries = useCallback(() => {
    setScreen("library");
  }, []);

  const handleCreateNavClick = useCallback(() => {
    setModalDefaultType("Screenplay");
    setShowModal(true);
  }, []);

  const handlePickerSelect = useCallback((type: "Screenplay" | "Novel") => {
    setModalDefaultType(type);
    setShowCreatePicker(false);
    setShowModal(true);
  }, []);

  // ── Delete project ───────────────────────────────────────────────────
  const handleDeleteProject = useCallback(
    (project: Project) => {
      // Remove from state
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      // Remove from localStorage
      const current = loadProjects().filter((p) => p.id !== project.id);
      saveProjects(current);
      // Remove from IndexedDB (async, fire-and-forget)
      void dbDeleteProject(project.id);
      // If the deleted project is currently open, go back to home
      if (currentProject?.id === project.id) {
        setCurrentProject(null);
        setScreen("home");
      }
      setDeleteConfirmProject(null);
      setShowMenu(false);
    },
    [currentProject],
  );

  // ── Export functions ───────────────────────────────────────────────

  function exportAsTxt() {
    const content = currentProject?.content || "";
    const projTitle = currentProject?.title || "Untitled";
    const blob = new Blob([`${projTitle}\n\n${content}`], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMenu(false);
  }

  function exportAsPdf() {
    const content = currentProject?.content || "";
    const projTitle = currentProject?.title || "Untitled";
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${projTitle}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 40px auto; font-size: 12pt; line-height: 1.7; color: #111; }
            h2 { font-size: 16pt; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.05em; }
            pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }
          </style>
        </head>
        <body>
          <h2>${projTitle}</h2>
          <pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    setShowMenu(false);
  }

  function exportAsEpub() {
    const content = currentProject?.content || "";
    const projTitle = currentProject?.title || "Untitled";
    const escapedContent = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const paragraphs = escapedContent
      .split("\n\n")
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("\n");

    const htmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
  <title>${projTitle}</title>
  <style>
    body { font-family: Georgia, serif; margin: 40px; line-height: 1.8; max-width: 600px; }
    h1 { font-size: 1.8em; text-align: center; margin-bottom: 2em; }
    p { margin-bottom: 1em; }
  </style>
</head>
<body>
  <h1>${projTitle}</h1>
  ${paragraphs}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "application/epub+zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projTitle}.epub`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMenu(false);
  }

  function handleMenuImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      if (currentProject) {
        const updated = {
          ...currentProject,
          content: text,
          lastEdited: Date.now(),
        };
        saveProject(updated);
        queueProjectSync(updated.id);
        setCurrentProject(updated);
        setProjects((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p)),
        );
      } else {
        const newTitle = file.name.replace(/\.(?:txt|fountain|fdx|md)$/, "");
        const newProj = createProject(newTitle, "Screenplay");
        const withContent = { ...newProj, content: text };
        saveProject(withContent);
        queueProjectSync(withContent.id);
        setProjects((prev) => [withContent, ...prev]);
        setCurrentProject(withContent);
        setScreen("create");
      }
      setShowMenu(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const currentTheme = THEMES.find((t) => t.id === activeThemeId);
  const isDay = activeThemeId === "day";
  const wGlyphColor =
    activeThemeId === "day" ? "rgba(0,0,0,0.04)" : "rgba(0,255,120,0.06)";

  return (
    <div className="relative min-h-screen">
      {/* Global W glyph — fixed, behind all content */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "65vw",
          fontWeight: 700,
          color: wGlyphColor,
          filter: "blur(4px)",
          zIndex: 0,
          pointerEvents: "none",
          userSelect: "none",
          letterSpacing: "-0.05em",
          lineHeight: 1,
        }}
      >
        W
      </div>

      <GlobalHeader
        onMenuClick={() => setShowMenu(true)}
        onSettingsClick={() => setShowSettings(true)}
      />

      {/* Hamburger drawer overlay */}
      {showMenu && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setShowMenu(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              zIndex: 80,
              cursor: "default",
              border: "none",
            }}
          />
          <div
            data-ocid="hamburger.panel"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "280px",
              zIndex: 90,
              background: "#0d0d0d",
              borderRight: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              flexDirection: "column",
              boxShadow: "4px 0 32px rgba(0,0,0,0.8)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 16px 16px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <h2
                className="font-bold"
                style={{
                  fontSize: "20px",
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                }}
              >
                Writefy
              </h2>
              <button
                type="button"
                data-ocid="hamburger.close_button"
                onClick={() => setShowMenu(false)}
                className="cursor-pointer transition-opacity hover:opacity-70"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "6px",
                  color: "#9AA0A6",
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label="Close menu"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {/* Export section */}
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#4B5563",
                  textTransform: "uppercase",
                  padding: "8px 16px 4px 16px",
                }}
              >
                Export{" "}
                {!currentProject && (
                  <span
                    style={{
                      color: "#ef4444",
                      fontSize: "9px",
                      marginLeft: "4px",
                    }}
                  >
                    (open a project first)
                  </span>
                )}
              </p>

              {/* Export as PDF */}
              <button
                type="button"
                data-ocid="hamburger.export_pdf.button"
                className="w-full cursor-pointer transition-colors"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "0 16px",
                  height: "48px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  color: currentProject
                    ? isDay
                      ? "#1a1a1a"
                      : "#E5E7EB"
                    : isDay
                      ? "#888888"
                      : "#4B5563",
                  fontSize: "14px",
                  opacity: currentProject ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (currentProject)
                    e.currentTarget.style.background = isDay
                      ? "rgba(0,0,0,0.05)"
                      : "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={exportAsPdf}
                disabled={!currentProject}
              >
                <FileDown
                  size={18}
                  style={{ color: "#22C55E", flexShrink: 0 }}
                />
                Export as PDF
              </button>

              {/* Export as TXT */}
              <button
                type="button"
                data-ocid="hamburger.export_txt.button"
                className="w-full cursor-pointer transition-colors"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "0 16px",
                  height: "48px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  color: currentProject
                    ? isDay
                      ? "#1a1a1a"
                      : "#E5E7EB"
                    : isDay
                      ? "#888888"
                      : "#4B5563",
                  fontSize: "14px",
                  opacity: currentProject ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (currentProject)
                    e.currentTarget.style.background = isDay
                      ? "rgba(0,0,0,0.05)"
                      : "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={exportAsTxt}
                disabled={!currentProject}
              >
                <FileText
                  size={18}
                  style={{ color: "#22C55E", flexShrink: 0 }}
                />
                Export as TXT
              </button>

              {/* Export as EPUB */}
              <button
                type="button"
                data-ocid="hamburger.export_epub.button"
                className="w-full cursor-pointer transition-colors"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "0 16px",
                  height: "48px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  color: currentProject
                    ? isDay
                      ? "#1a1a1a"
                      : "#E5E7EB"
                    : isDay
                      ? "#888888"
                      : "#4B5563",
                  fontSize: "14px",
                  opacity: currentProject ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (currentProject)
                    e.currentTarget.style.background = isDay
                      ? "rgba(0,0,0,0.05)"
                      : "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={exportAsEpub}
                disabled={!currentProject}
              >
                <Download
                  size={18}
                  style={{ color: "#22C55E", flexShrink: 0 }}
                />
                Export as EPUB
              </button>

              {/* Import File */}
              <button
                type="button"
                data-ocid="hamburger.import.button"
                className="w-full cursor-pointer transition-colors"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "0 16px",
                  height: "48px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  color: isDay ? "#1a1a1a" : "#E5E7EB",
                  fontSize: "14px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDay
                    ? "rgba(0,0,0,0.05)"
                    : "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={() => menuImportRef.current?.click()}
              >
                <Upload size={18} style={{ color: "#22C55E", flexShrink: 0 }} />
                Import File
              </button>

              <div
                style={{
                  height: "1px",
                  background: "rgba(255,255,255,0.07)",
                  margin: "8px 16px",
                }}
              />

              {/* Library */}
              <button
                type="button"
                data-ocid="hamburger.library.button"
                className="w-full cursor-pointer transition-colors"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "0 16px",
                  height: "48px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  color: "#E5E7EB",
                  fontSize: "14px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={() => {
                  handleNavigate("library");
                  setShowMenu(false);
                }}
              >
                <BookMarked
                  size={18}
                  style={{ color: "#22C55E", flexShrink: 0 }}
                />
                Library
              </button>

              {/* Account / Cloud */}
              <button
                type="button"
                data-ocid="hamburger.account.button"
                className="w-full cursor-pointer transition-colors"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "0 16px",
                  height: "48px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  color: "#E5E7EB",
                  fontSize: "14px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Cloud size={18} style={{ color: "#22C55E", flexShrink: 0 }} />
                Account / Cloud
              </button>

              {/* Delete Project — only shown when a project is open */}
              {currentProject && (
                <button
                  type="button"
                  data-ocid="hamburger.delete_project.button"
                  className="w-full cursor-pointer transition-colors"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "0 16px",
                    height: "48px",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    color: "#ef4444",
                    fontSize: "14px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  onClick={() => {
                    setDeleteConfirmProject(currentProject);
                  }}
                >
                  <Trash2
                    size={18}
                    style={{ color: "#ef4444", flexShrink: 0 }}
                  />
                  Delete Project
                </button>
              )}

              <div
                style={{
                  height: "1px",
                  background: "rgba(255,255,255,0.07)",
                  margin: "8px 16px",
                }}
              />

              {/* Reader Mode */}
              <button
                type="button"
                data-ocid="hamburger.play.button"
                className="w-full cursor-pointer transition-colors"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "0 16px",
                  height: "48px",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                  color: "#E5E7EB",
                  fontSize: "14px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={() => {
                  handleNavigate("play");
                  setShowMenu(false);
                }}
              >
                <Clapperboard
                  size={18}
                  style={{ color: "#22C55E", flexShrink: 0 }}
                />
                Reader Mode
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main content — offset by header height (72px) */}
      <main
        className="relative z-10"
        style={{
          paddingTop: "80px",
          paddingBottom: "calc(8vh + 16px)",
        }}
      >
        {showSettings ? (
          <SettingsScreen
            onBack={() => setShowSettings(false)}
            onThemeChange={handleThemeChange}
            activeThemeId={activeThemeId}
          />
        ) : (
          <>
            {screen === "home" && (
              <HomeScreen
                projects={projects}
                onNavigate={handleNavigate}
                onOpenProject={handleOpenProject}
                onNewProject={() => setShowModal(true)}
                onDeleteProject={(p) => setDeleteConfirmProject(p)}
              />
            )}
            {screen === "library" && (
              <LibraryScreen
                projects={projects}
                series={seriesList}
                onOpenProject={handleOpenProject}
                onOpenSeries={handleOpenSeries}
                onDeleteProject={(p) => setDeleteConfirmProject(p)}
              />
            )}
            {screen === "create" && (
              <CreateScreen
                project={currentProject}
                onBack={handleBackFromCreate}
                onProjectUpdate={handleProjectUpdate}
                activeTheme={currentTheme}
                onSaveAndReturn={
                  previousScreen === "play"
                    ? () => {
                        setPreviousScreen(null);
                        setScreen("play");
                      }
                    : undefined
                }
              />
            )}
            {screen === "play" && (
              <PlayScreen
                project={currentProject}
                onNavigate={handleNavigate}
                activeTheme={currentTheme}
                onEditProject={() => {
                  setPreviousScreen("play");
                  setScreen("create");
                }}
              />
            )}
            {screen === "series" && currentSeries && (
              <SeriesScreen
                series={currentSeries}
                onBack={handleBackFromSeries}
                onOpenProject={handleOpenProject}
                onSeriesUpdate={handleSeriesUpdate}
              />
            )}
          </>
        )}
      </main>

      <BottomNav
        activeScreen={screen}
        onNavigate={handleNavigate}
        onCreateClick={handleCreateNavClick}
      />

      {/* Create Type Picker Bottom Sheet */}
      {showCreatePicker && (
        <dialog
          data-ocid="create_picker.modal"
          open
          className="fixed inset-0 z-[90] flex flex-col justify-end w-full h-full max-w-none max-h-none border-0 m-0 p-0"
          style={{
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
          }}
          aria-labelledby="picker-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowCreatePicker(false);
          }}
        >
          <button
            type="button"
            className="absolute inset-0 w-full h-full cursor-default"
            style={{ background: "transparent", border: "none" }}
            onClick={() => setShowCreatePicker(false)}
            aria-label="Close picker"
            tabIndex={-1}
          />

          <div
            className="relative w-full rounded-t-3xl"
            style={{
              background: "#111111",
              border: "1px solid rgba(0,255,80,0.15)",
              borderBottom: "none",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.8)",
              padding: "20px 16px 32px 16px",
            }}
          >
            <div
              className="mx-auto mb-5 rounded-full"
              style={{
                width: "40px",
                height: "4px",
                background: "rgba(255,255,255,0.15)",
              }}
            />

            <div className="flex items-center justify-between mb-5">
              <h2
                id="picker-title"
                className="text-xl font-bold text-white"
                style={{ letterSpacing: "-0.02em" }}
              >
                What are you creating?
              </h2>
              <button
                type="button"
                data-ocid="create_picker.close_button"
                onClick={() => setShowCreatePicker(false)}
                className="p-2 rounded-full transition-colors cursor-pointer"
                style={{ background: "rgba(255,255,255,0.06)" }}
                aria-label="Close picker"
              >
                <X size={18} style={{ color: "#9AA0A6" }} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              {/* Novel */}
              <button
                type="button"
                data-ocid="create_picker.novel.button"
                onClick={() => handlePickerSelect("Novel")}
                className="rounded-2xl cursor-pointer text-left transition-all duration-200"
                style={{
                  height: "140px",
                  padding: "16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(34,197,94,0.1)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  📖
                </div>
                <div>
                  <p
                    className="text-white font-bold"
                    style={{
                      fontSize: "15px",
                      letterSpacing: "-0.01em",
                      marginBottom: "4px",
                    }}
                  >
                    Novel
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#9AA0A6",
                      lineHeight: 1.4,
                    }}
                  >
                    Long-form narrative fiction
                  </p>
                </div>
              </button>

              {/* Screenplay */}
              <button
                type="button"
                data-ocid="create_picker.screenplay.button"
                onClick={() => handlePickerSelect("Screenplay")}
                className="rounded-2xl cursor-pointer text-left transition-all duration-200"
                style={{
                  height: "140px",
                  padding: "16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(34,197,94,0.1)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  🎬
                </div>
                <div>
                  <p
                    className="text-white font-bold"
                    style={{
                      fontSize: "15px",
                      letterSpacing: "-0.01em",
                      marginBottom: "4px",
                    }}
                  >
                    Screenplay
                  </p>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#9AA0A6",
                      lineHeight: 1.4,
                    }}
                  >
                    Cinematic script format
                  </p>
                </div>
              </button>
            </div>

            {/* Series — full width */}
            <button
              type="button"
              data-ocid="create_picker.series.button"
              onClick={() => {
                setShowCreatePicker(false);
                setShowModal(true);
                setModalDefaultType("Series" as ProjectType);
              }}
              className="w-full rounded-2xl cursor-pointer text-left transition-all duration-200"
              style={{
                padding: "16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                marginBottom: "12px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(34,197,94,0.1)";
                e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "9px",
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                }}
              >
                <Layers size={18} style={{ color: "#22C55E" }} />
              </div>
              <div>
                <p
                  className="text-white font-bold"
                  style={{
                    fontSize: "15px",
                    letterSpacing: "-0.01em",
                    marginBottom: "3px",
                  }}
                >
                  Series
                </p>
                <p style={{ fontSize: "11px", color: "#9AA0A6" }}>
                  Web novels, episodes &amp; folders
                </p>
              </div>
            </button>

            <button
              type="button"
              data-ocid="create_picker.cancel_button"
              onClick={() => setShowCreatePicker(false)}
              className="w-full py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#6B7280",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
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
      )}

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreateProject}
          onCreateSeries={handleCreateSeries}
          defaultType={modalDefaultType}
        />
      )}

      {showInstallBanner && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "rgba(0,0,0,0.92)",
            border: "1px solid rgba(34,197,94,0.4)",
            borderRadius: "12px",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 4px 24px rgba(0,255,120,0.15)",
            backdropFilter: "blur(12px)",
            minWidth: "260px",
          }}
        >
          <span
            style={{
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              flex: 1,
            }}
          >
            Install Writefy on your device
          </span>
          <button
            type="button"
            onClick={handleInstall}
            style={{
              background: "#22C55E",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setShowInstallBanner(false)}
            style={{
              background: "transparent",
              color: "#666",
              border: "none",
              fontSize: "16px",
              cursor: "pointer",
              padding: "0 4px",
              lineHeight: "1",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmProject && (
        <>
          <div
            role="button"
            tabIndex={-1}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              zIndex: 200,
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setDeleteConfirmProject(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setDeleteConfirmProject(null);
            }}
          />
          <div
            data-ocid="delete_confirm.modal"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 201,
              background: "#111",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "16px",
              padding: "24px 20px",
              width: "min(320px, calc(100vw - 32px))",
              boxShadow: "0 8px 48px rgba(0,0,0,0.9)",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <Trash2 size={20} style={{ color: "#ef4444" }} />
            </div>
            <h3
              className="text-white font-bold"
              style={{ fontSize: "16px", marginBottom: "8px" }}
            >
              Delete Project?
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#9AA0A6",
                marginBottom: "20px",
                lineHeight: 1.5,
              }}
            >
              "{deleteConfirmProject.title}" will be permanently deleted. This
              cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                data-ocid="delete_confirm.cancel_button"
                onClick={() => setDeleteConfirmProject(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#9AA0A6",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-ocid="delete_confirm.confirm_button"
                onClick={() => handleDeleteProject(deleteConfirmProject)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: "#ef4444",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden file input for hamburger menu import */}
      <input
        ref={menuImportRef}
        type="file"
        accept=".txt,.fountain,.fdx,.md"
        style={{ display: "none" }}
        onChange={handleMenuImport}
      />
    </div>
  );
}

export default App;
