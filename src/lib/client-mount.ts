/**
 * Client-only mount for overlays that touch window.
 * subscribe notifies once so hydration (server snapshot = false) flips to
 * the client snapshot. A no-op subscribe left the live preview on chrome
 * with no hall — React never re-rendered after the SSR pass.
 */

import { useSyncExternalStore } from "react";

export function subscribeClientMount(onStoreChange: () => void): () => void {
  const id = setTimeout(onStoreChange, 0);
  return () => clearTimeout(id);
}

export function getClientMounted(): boolean {
  return true;
}

export function getServerMounted(): boolean {
  return false;
}

export function useClientMounted(): boolean {
  return useSyncExternalStore(subscribeClientMount, getClientMounted, getServerMounted);
}
