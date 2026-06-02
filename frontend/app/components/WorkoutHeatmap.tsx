"use client";

import { useEffect, useState } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import type { Activity } from "react-activity-calendar";
import styles from "../page.module.css";

function buildMockData(): Activity[] {
  const today = new Date();
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  start.setDate(start.getDate() + 1);

  const result: Activity[] = [];
  const cur = new Date(start);

  while (cur <= today) {
    const dateStr = cur.toISOString().split("T")[0];
    const dayIndex = Math.floor((cur.getTime() - start.getTime()) / 86400000);
    const pseudo = ((dayIndex * 1_103_515_245 + 12_345) >>> 0) % 100;

    let count = 0;
    let level = 0;

    if (pseudo < 55) {
      if (pseudo < 8) { count = 3; level = 4; }
      else if (pseudo < 18) { count = 2; level = 3; }
      else if (pseudo < 33) { count = 1; level = 2; }
      else { count = 1; level = 1; }
    }

    result.push({ date: dateStr, count, level });
    cur.setDate(cur.getDate() + 1);
  }

  return result;
}

const jaMonths = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const jaWeekdays = ["日", "月", "火", "水", "木", "金", "土"];

export function WorkoutHeatmap() {
  const [data, setData] = useState<Activity[]>([]);

  useEffect(() => {
    setData(buildMockData());
  }, []);

  return (
    <section className={styles.heatmapSection} aria-label="継続日数カレンダー">
      <div className={styles.logHeader}>
        <h3>継続カレンダー</h3>
        <span>過去1年間</span>
      </div>
      <div className={styles.heatmapWrapper}>
        {data.length > 0 ? (
          <ActivityCalendar
            data={data}
            blockSize={12}
            blockMargin={3}
            blockRadius={2}
            fontSize={11}
            weekStart={1}
            showWeekdayLabels={["mon", "wed", "fri"]}
            labels={{
              months: jaMonths,
              weekdays: jaWeekdays,
              totalCount: "{{year}}年 {{count}}回トレーニング",
              legend: { less: "少", more: "多" },
            }}
            theme={{
              light: ["#ebedf0", "#c6e48b", "#7bc96f", "#239a3b", "#196127"],
              dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
            }}
          />
        ) : (
          <ActivityCalendar data={[]} loading blockSize={12} blockMargin={3} />
        )}
      </div>
    </section>
  );
}
