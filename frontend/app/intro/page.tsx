import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ゴートレ Introduction",
  description: "Demo introduction site for ゴートレ.",
};

export default function IntroPage() {
  return (
    <main style={{ width: "100%", height: "100dvh", overflow: "hidden", background: "#0d0d0d" }}>
      <iframe
        src="/index.html"
        title="ゴートレ introduction"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </main>
  );
}
