import { CocoonWorkspace } from "@/components/workspace/cocoon-workspace";

export default function HomePage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--bg-page)" }}>
      <CocoonWorkspace />
    </main>
  );
}
