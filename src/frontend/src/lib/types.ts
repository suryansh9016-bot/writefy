export type ProjectType = "Screenplay" | "Novel" | "Series";

export type FormatType = "slugline" | "action" | "character" | "dialogue";

export interface SceneItem {
  id: string;
  title: string;
  content: string;
  type: FormatType;
}

export interface Project {
  id: string;
  title: string;
  type: ProjectType;
  content: string;
  scenes: SceneItem[];
  wordCount: number;
  sceneCount: number;
  lastEdited: number;
  createdAt: number;
}

export interface SeriesItem {
  id: string;
  name: string;
  type: "folder" | "episode";
  projectType?: "Screenplay" | "Novel";
  projectId?: string;
  children?: SeriesItem[];
  order: number;
}

export interface Series {
  id: string;
  title: string;
  description?: string;
  items: SeriesItem[];
  wordCount: number;
  itemCount: number;
  lastEdited: number;
  createdAt: number;
}

export type Screen = "home" | "library" | "create" | "play" | "series";
