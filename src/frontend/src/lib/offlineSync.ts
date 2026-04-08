const SYNC_QUEUE_KEY = "writefy_sync_queue";

function loadQueue(): string[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveQueue(queue: string[]): void {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export function queueProjectSync(projectId: string): void {
  const queue = loadQueue();
  if (!queue.includes(projectId)) {
    queue.push(projectId);
    saveQueue(queue);
  }
}

export function getPendingSyncCount(): number {
  return loadQueue().length;
}

export function clearSyncQueue(): void {
  localStorage.removeItem(SYNC_QUEUE_KEY);
}
