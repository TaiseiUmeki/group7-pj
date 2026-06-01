"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "../page.module.css";
import type { View } from "../types/workout";
import { BottomNav } from "./BottomNav";
import { BellIcon } from "./icons";
import ThemeToggle from "./ThemeToggle";

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
				<ThemeToggle />
				<button
					className={`${styles.help} glass ${activeView === "notifications" ? styles.activeNotificationButton : ""}`}
					onClick={() => router.push("/notifications")}
					type="button"
					aria-label="通知を開く"
				>
					<BellIcon />
				</button>
			</section>
		</main>
	);
}

export default AppShell;
