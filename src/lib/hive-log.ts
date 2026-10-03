import type { HiveDraft } from "./hive";

type Listener = () => void;

const queue: HiveDraft[] = [];
const listeners = new Set<Listener>();

export function logHive(draft: HiveDraft) {
  const body = draft.body.trim().slice(0, 280);
  const title = draft.title.trim().slice(0, 80);
  if (!title || !body) return;
  queue.push({
    ...draft,
    title,
    body,
    flow: draft.flow ?? "in",
    actor: draft.actor.slice(0, 48),
  });
  if (queue.length > 80) queue.splice(0, queue.length - 80);
  for (const fn of listeners) fn();
}

export function drainHiveQueue(): HiveDraft[] {
  return queue.splice(0, queue.length);
}

export function hiveQueueSize(): number {
  return queue.length;
}

export function onHiveQueued(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
