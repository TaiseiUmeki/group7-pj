"use client";

import type { TouchEvent, WheelEvent } from "react";
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
  const [activePage, setActivePage] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

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

  const radarLevels = [0.25, 0.5, 0.75, 1];
  const radarCenter = 100;
  const radarRadius = 70;
  const radarAngles = weeklyReport.radarScores.map((_, index) => (
    -Math.PI / 2 + (index * 2 * Math.PI) / weeklyReport.radarScores.length
  ));
  const radarPoint = (angle: number, radius: number) => (
    `${radarCenter + Math.cos(angle) * radius},${radarCenter + Math.sin(angle) * radius}`
  );
  const radarPolygon = weeklyReport.radarScores.map((item, index) => {
    const ratio = activePage === 2 && mounted ? item.score / maxRadarScore : 0;
    return radarPoint(radarAngles[index], radarRadius * ratio);
  }).join(" ");

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const pages = [
    { title: "サマリー", label: "合計時間 / ランク" },
    { title: "日別時間", label: "7日間の長條図" },
    { title: "部位別", label: "訓練スコア" },
    { title: "開始時間", label: "タイムライン" },
  ];

  const movePage = (direction: 1 | -1) => {
    setActivePage((page) => Math.min(pages.length - 1, Math.max(0, page + direction)));
  };

  const handleWheel = (event: WheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaY) < 24) {
      return;
    }
    event.preventDefault();
    movePage(event.deltaY > 0 ? 1 : -1);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (touchStartY === null) {
      return;
    }
    const deltaY = touchStartY - event.changedTouches[0].clientY;
    setTouchStartY(null);
    if (Math.abs(deltaY) < 42) {
      return;
    }
    movePage(deltaY > 0 ? 1 : -1);
  };

  return (
    <article
      className={styles.weeklyReportCard}
      onTouchEnd={handleTouchEnd}
      onTouchStart={(event) => setTouchStartY(event.touches[0].clientY)}
      onWheel={handleWheel}
    >
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

      <nav className={styles.weeklyPager} aria-label="週報ページ">
        {pages.map((page, index) => (
          <button
            aria-current={activePage === index ? "page" : undefined}
            className={activePage === index ? styles.weeklyPagerActive : ""}
            key={page.title}
            onClick={() => setActivePage(index)}
            type="button"
          >
            <strong>{index + 1}</strong>
            <span>{page.title}</span>
          </button>
        ))}
      </nav>

      <div className={styles.weeklyPageFrame}>
        <div className={styles.weeklyPageTrack} style={{ transform: `translateY(-${activePage * 100}%)` }}>
          <section className={`${styles.weeklyPage} ${styles.weeklySummaryPage}`}>
            <div className={styles.weeklyMainStat}>
              <span>合計訓練時間</span>
              <strong>
                <CountUp value={weeklyReport.totalTrainingMinutes} /> 分
              </strong>
              <small>先週 7 日間の合計</small>
            </div>

            <div className={styles.weeklySummarySide}>
              <div className={styles.weeklySmallStat}>
                <span>好友内排名</span>
                <strong>
                  第 <CountUp value={weeklyReport.friendRank} duration={700} /> 位
                </strong>
                <small>{pages[0].label}</small>
              </div>

              <div className={styles.weeklySmallStat}>
                <span>平均時間</span>
                <strong>
                  <CountUp value={averageMinutes} /> 分
                </strong>
                <small>最多訓練日: {bestDay.label} / {bestDay.minutes}分</small>
              </div>
            </div>
          </section>

          <section className={styles.weeklyPage}>
            <div className={styles.weeklyPanelHeader}>
              <div>
                <h3>日別トレーニング</h3>
                <p>曜日ごとの訓練時間を横向きの長條図で表示します。</p>
              </div>
              <strong>{bestDay.minutes} 分</strong>
            </div>

            <div className={styles.weeklyHorizontalBars}>
              {weeklyReport.dailyTrainingMinutes.map((item, index) => {
                const width = activePage === 1 && mounted
                  ? `${Math.max(8, (item.minutes / maxDailyMinutes) * 100)}%`
                  : "0%";

                return (
                  <div className={styles.weeklyHorizontalBarRow} key={item.day}>
                    <span>{item.label}</span>
                    <div>
                      <i
                        style={{
                          width,
                          transitionDelay: `${index * 80}ms`,
                        }}
                      />
                    </div>
                    <strong>{item.minutes}分</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.weeklyPage}>
            <div className={styles.weeklyPanelHeader}>
              <div>
                <h3>部位別バランス</h3>
                <p>五角形レーダーで訓練部位の偏りを可視化します。</p>
              </div>
            </div>

            <div className={styles.weeklyRadarChartWrap}>
              <svg className={styles.weeklyRadarChart} viewBox="0 0 200 200" role="img" aria-label="部位別バランスの五角レーダー図">
                {radarLevels.map((level) => (
                  <polygon
                    className={styles.weeklyRadarGrid}
                    key={level}
                    points={radarAngles.map((angle) => radarPoint(angle, radarRadius * level)).join(" ")}
                  />
                ))}
                {radarAngles.map((angle, index) => (
                  <line
                    className={styles.weeklyRadarAxis}
                    key={weeklyReport.radarScores[index].area}
                    x1={radarCenter}
                    y1={radarCenter}
                    x2={radarCenter + Math.cos(angle) * radarRadius}
                    y2={radarCenter + Math.sin(angle) * radarRadius}
                  />
                ))}
                <polygon className={styles.weeklyRadarArea} points={radarPolygon} />
                {weeklyReport.radarScores.map((item, index) => (
                  <g key={item.area}>
                    <circle
                      className={styles.weeklyRadarPoint}
                      cx={radarCenter + Math.cos(radarAngles[index]) * radarRadius * (activePage === 2 && mounted ? item.score / maxRadarScore : 0)}
                      cy={radarCenter + Math.sin(radarAngles[index]) * radarRadius * (activePage === 2 && mounted ? item.score / maxRadarScore : 0)}
                      r="3.5"
                    />
                    <text
                      className={styles.weeklyRadarLabel}
                      textAnchor="middle"
                      x={radarCenter + Math.cos(radarAngles[index]) * 91}
                      y={radarCenter + Math.sin(radarAngles[index]) * 91 + 4}
                    >
                      {item.area}
                    </text>
                    <text
                      className={styles.weeklyRadarValue}
                      textAnchor="middle"
                      x={radarCenter + Math.cos(radarAngles[index]) * 81}
                      y={radarCenter + Math.sin(radarAngles[index]) * 81 + 4}
                    >
                      {item.score}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </section>

          <section className={styles.weeklyPage}>
            <div className={styles.weeklyPanelHeader}>
              <div>
                <h3>開始時間タイムライン</h3>
                <p>24時間上の開始位置を一週間分ならべました。</p>
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
      </div>

      <div className={styles.weeklyPageActions}>
        <button
          disabled={activePage === 0}
          onClick={() => movePage(-1)}
          type="button"
        >
          上へ
        </button>
        <span>{activePage + 1} / {pages.length} · {pages[activePage].label}</span>
        <button
          disabled={activePage === pages.length - 1}
          onClick={() => movePage(1)}
          type="button"
        >
          下へ
        </button>
      </div>
    </article>
  );
}
