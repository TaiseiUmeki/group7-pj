import styles from "../page.module.css";
import type { View } from "../types/workout";
import { BoltIcon, HomeIcon, UserIcon } from "./icons";

export function BottomNav({
  activeView,
  onTimeline,
  onQuickStart,
  onProfile,
}: {
  activeView: View;
  onTimeline: () => void;
  onQuickStart: () => void;
  onProfile: () => void;
}) {
  const timelineActive = activeView === "timeline" || activeView === "postDetail" || activeView === "createRecord" || activeView === "member";

  return (
    <nav className={styles.nav} aria-label="メインナビゲーション">
      <button className={timelineActive ? styles.activeNav : ""} onClick={onTimeline} type="button">
        <HomeIcon />
        <span>TL</span>
      </button>
      <button
        className={`${styles.quickButton} ${activeView === "quickStart" ? styles.quickActive : ""}`}
        onClick={onQuickStart}
        type="button"
      >
        <BoltIcon />
        <span>START</span>
      </button>
      <button className={activeView === "profile" ? styles.activeNav : ""} onClick={onProfile} type="button">
        <UserIcon />
        <span>プロフィール</span>
      </button>
    </nav>
  );
}

