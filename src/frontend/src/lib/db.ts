import type { Project, Series } from "./types";

const DB_NAME = "writefy_db";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("series")) {
        db.createObjectStore("series", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txGet<T>(
  db: IDBDatabase,
  store: string,
  key: string,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function txGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function txPut<T>(db: IDBDatabase, store: string, item: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function txDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAllProjects(): Promise<Project[]> {
  try {
    const db = await openDB();
    return txGetAll<Project>(db, "projects");
  } catch {
    return [];
  }
}

export async function dbPutProject(project: Project): Promise<void> {
  try {
    const db = await openDB();
    await txPut<Project>(db, "projects", project);
  } catch {
    // Silently fail — localStorage is still the primary cache
  }
}

export async function dbDeleteProject(id: string): Promise<void> {
  try {
    const db = await openDB();
    await txDelete(db, "projects", id);
  } catch {
    // Silently fail
  }
}

export async function dbGetProject(id: string): Promise<Project | undefined> {
  try {
    const db = await openDB();
    return txGet<Project>(db, "projects", id);
  } catch {
    return undefined;
  }
}

export async function dbGetAllSeries(): Promise<Series[]> {
  try {
    const db = await openDB();
    return txGetAll<Series>(db, "series");
  } catch {
    return [];
  }
}

export async function dbPutSeries(series: Series): Promise<void> {
  try {
    const db = await openDB();
    await txPut<Series>(db, "series", series);
  } catch {
    // Silently fail
  }
}

export async function dbDeleteSeries(id: string): Promise<void> {
  try {
    const db = await openDB();
    await txDelete(db, "series", id);
  } catch {
    // Silently fail
  }
}
