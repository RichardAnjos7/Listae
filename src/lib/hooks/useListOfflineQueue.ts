"use client";

const QUEUE_KEY = "ilist_list_offline_queue";

export type ListOfflineAction = {
  id: string;
  type: "add" | "update" | "remove";
  listId: string;
  payload: Record<string, unknown>;
  at: number;
};

function readQueue(): ListOfflineAction[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as ListOfflineAction[];
  } catch {
    return [];
  }
}

function writeQueue(q: ListOfflineAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function enqueueListAction(action: Omit<ListOfflineAction, "id" | "at">) {
  const q = readQueue();
  q.push({ ...action, id: crypto.randomUUID(), at: Date.now() });
  writeQueue(q);
}

export async function flushListOfflineQueue(
  handlers: {
    add: (listId: string, payload: Record<string, unknown>) => Promise<void>;
    update: (listId: string, payload: Record<string, unknown>) => Promise<void>;
    remove: (listId: string, payload: Record<string, unknown>) => Promise<void>;
  }
) {
  if (!navigator.onLine) return;
  const q = readQueue();
  if (q.length === 0) return;

  const remaining: ListOfflineAction[] = [];
  for (const action of q) {
    try {
      if (action.type === "add") await handlers.add(action.listId, action.payload);
      else if (action.type === "update") await handlers.update(action.listId, action.payload);
      else if (action.type === "remove") await handlers.remove(action.listId, action.payload);
    } catch {
      remaining.push(action);
    }
  }
  writeQueue(remaining);
}
