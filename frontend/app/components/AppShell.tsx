"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";
import type { View } from "../types/workout";
import { BottomNav } from "./BottomNav";

export function AppShell({
  activeView,
  children,
}: {
  activeView: View;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <main className={styles.app}>
      <section className={styles.viewport}>
        {children}
        <BottomNav
          activeView={activeView}
          onTimeline={() => router.push("/")}
          onQuickStart={() => router.push("/quick-start")}
          onProfile={() => router.push("/profile")}
        />
        <button className={styles.help} type="button" aria-label="ヘルプを開く">
          ?
        </button>
      </section>
    </main>
  );
}
