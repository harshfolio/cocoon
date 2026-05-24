import type { Metadata, Viewport } from "next";
import { ClientPageShell } from "@/components/client/client-page-shell";

export const metadata: Metadata = {
  title: "Cocoon — Patient",
  description: "Your Cocoon care call",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function ClientPage() {
  return <ClientPageShell />;
}
