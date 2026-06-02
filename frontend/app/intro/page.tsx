import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "IRONLOG Introduction",
  description: "Demo introduction site for IRONLOG.",
};

export default function IntroPage() {
  return (
    <main style={{ width: "100%", height: "100dvh", overflow: "hidden", background: "#0d0d0d" }}>
      <iframe
        src="/index.html"
        title="IRONLOG introduction"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </main>
  );
}
