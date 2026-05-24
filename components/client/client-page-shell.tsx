"use client";

/**
 * Thin client-only shell that mounts the ClientView.
 * Kept separate from page.tsx so the server page can export metadata
 * while this component handles all client-side state/effects.
 */

import { ClientView } from "./client-view";

export function ClientPageShell() {
  return <ClientView />;
}
