"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../page.module.css";

const weeklyReport = {
  totalTrainingMinutes: 385,
  friendRank: 1,
  dailyTrainingMinutes: [
    { day: "DayAgo 2", label: "月", minutes: 70 },
    { day: "DayAgo 3", label: "火", minutes: 60 },
    { day: "DayAgo 4", label: "水", minutes: 45 },
    { day: "DayAgo 5", label: "木", minutes: 50 },
    { day: "DayAgo 6", label: "金", minutes: 40 },
    { day: "DayAgo 7", label: "土", minutes: 65 },
    { day: "DayAgo 8", label: "日", minutes: 55 },
  ],
  radarScores: [
    { area: "下半身", score: 125 },
    { area: "背中", score: 125 },
    { area: "胸", score: 45 },
    { area: "肩", score: 50 },
    { area: "体幹", score: 40 },
  ],
  startTimeTimeline: [
    { day: "DayAgo 2", label: "月", hour: 18 },
    { day: "DayAgo 3", label: "火", hour: 19 },
    { day: "DayAgo 4", label: "水", hour: 20 },
    { day: "DayAgo 5", label: "木", hour: 18 },
    { day: "DayAgo 6", label: "金", hour: 19 },
    { day: "DayAgo 7", label: "土", hour: 17 },
    { day: "DayAgo 8", label: "日", hour: 20 },
  ],
};

function CountUp({
  value,
  duration = 1200,
}: {
  value: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let frameId: number;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;

      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setCount(Math.floor(eased * value));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <>{count}</>;
}

export function WeeklyReportCard() {
  const [mounted, setMounted] = useState(false);
  const [activeDay, setActiveDay] = useState(weeklyReport.dailyTrainingMinutes[0]);

  const maxDailyMinutes = Math.max(
    ...weeklyReport.dailyTrainingMinutes.map((item) => item.minutes)
  );

  const maxRadarScore = Math.max(
    ...weeklyReport.radarScores.map((item) => item.score)
  );

  const averageMinutes = Math.round(
    weeklyReport.totalTrainingMinutes / weeklyReport.dailyTrainingMinutes.length
  );

  const bestDay = useMemo(() => {
    return weeklyReport.dailyTrainingMinutes.reduce((max, item) =>
      item.minutes > max.minutes ? item : max
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <article className={styles.weeklyReportCard}>
      <div className={styles.weeklyGlow} />

      <header className={styles.weeklyReportHero}>
        <div>
          <p className={styles.weeklyEyebrow}>Weekly Training Report</p>
          <h2 className={styles.weeklyTitle}>先週の訓練レポート</h2>
          <p className={styles.weeklyLead}>
            先週のトレーニング時間、開始傾向、部位バランスをまとめました。
          </p>
        </div>

        <div className={styles.weeklyRankBadge}>
          <span>好友内排名</span>
          <strong>
            第 <CountUp value={weeklyReport.friendRank} duration={700} /> 位
          </strong>
        </div>
      </header>

      <section className={styles.weeklyStatsGrid}>
        <div className={styles.weeklyMainStat}>
          <span>合計訓練時間</span>
          <strong>
            <CountUp value={weeklyReport.totalTrainingMinutes} /> 分
          </strong>
          <small>先週 7 日間の合計</small>
        </div>

        <div className={styles.weeklySmallStat}>
          <span>平均時間</span>
          <strong>
            <CountUp value={averageMinutes} /> 分
          </strong>
          <small>1日あたり</small>
        </div>

        <div className={styles.weeklySmallStat}>
          <span>最多訓練日</span>
          <strong>{bestDay.label}</strong>
          <small>{bestDay.minutes} 分</small>
        </div>
      </section>

      <section className={styles.weeklyPanel}>
        <div className={styles.weeklyPanelHeader}>
          <div>
            <h3>日別トレーニング</h3>
            <p>クリックすると下の表示が変わります</p>
          </div>
          <strong>{activeDay.minutes} 分</strong>
        </div>

        <div className={styles.weeklyBarChart}>
          {weeklyReport.dailyTrainingMinutes.map((item, index) => {
            const height = mounted
              ? `${Math.max(14, (item.minutes / maxDailyMinutes) * 100)}%`
              : "0%";

            const isActive = activeDay.day === item.day;

            return (
              <button
                key={item.day}
                type="button"
                className={`${styles.weeklyBarItem} ${
                  isActive ? styles.weeklyBarItemActive : ""
                }`}
                onClick={() => setActiveDay(item)}
              >
                <div className={styles.weeklyBarColumn}>
                  <i
                    style={{
                      height,
                      transitionDelay: `${index * 80}ms`,
                    }}
                  />
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className={styles.weeklyBottomGrid}>
        <section className={styles.weeklyPanel}>
          <div className={styles.weeklyPanelHeader}>
            <div>
              <h3>部位別バランス</h3>
              <p>上位五種の訓練区域</p>
            </div>
          </div>

          <div className={styles.weeklyRadarList}>
            {weeklyReport.radarScores.map((item, index) => (
              <div className={styles.weeklyRadarRow} key={item.area}>
                <span>{item.area}</span>

                <div>
                  <i
                    style={{
                      width: mounted
                        ? `${Math.max(10, (item.score / maxRadarScore) * 100)}%`
                        : "0%",
                      transitionDelay: `${index * 90}ms`,
                    }}
                  />
                </div>

                <strong>
                  <CountUp value={item.score} duration={900} />
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.weeklyPanel}>
          <div className={styles.weeklyPanelHeader}>
            <div>
              <h3>開始時間タイムライン</h3>
              <p>24時間上の開始位置</p>
            </div>
          </div>

          <div className={styles.weeklyTimelineScale}>
            <span>0</span>
            <span>6</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>

          <div className={styles.weeklyTimelineList}>
            {weeklyReport.startTimeTimeline.map((item, index) => (
              <div className={styles.weeklyTimelineRow} key={item.day}>
                <span>{item.label}</span>

                <div>
                  <i
                    style={{
                      left: mounted ? `${(item.hour / 24) * 100}%` : "0%",
                      transitionDelay: `${index * 90}ms`,
                    }}
                  >
                    ↓
                  </i>
                </div>

                <strong>{item.hour}:00</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}