"use client";

import { useState } from "react";
import styles from "./page.module.css";

type TimelineTab = "recommended" | "following";
type View = "timeline" | "quickStart" | "profile" | "member";
type Tone = "blue" | "green" | "purple";

type TrainingLog = {
  date: string;
  exercise: string;
  detail: string;
};

type Profile = {
  name: string;
  handle: string;
  bio: string;
  tone: Tone;
  records: string;
  streak: string;
  achievements: string;
  logs: TrainingLog[];
};

type TimelinePost = {
  id: number;
  author: Profile;
  message: string;
  postedAt: string;
  likes: number;
};

const myProfile: Profile = {
  name: "山田 太郎",
  handle: "@taro_training",
  bio: "週4日トレーニング中。BIG3を伸ばしながら、楽しく継続する仲間を探しています。",
  tone: "blue",
  records: "128",
  streak: "18日",
  achievements: "24",
  logs: [
    { date: "5月26日", exercise: "ベンチプレス", detail: "4セット x 8回 / 82.5kg" },
    { date: "5月24日", exercise: "スクワット", detail: "5セット x 5回 / 110kg" },
    { date: "5月23日", exercise: "デッドリフト", detail: "3セット x 5回 / 130kg" },
  ],
};

const recommendedPosts: TimelinePost[] = [
  {
    id: 1,
    author: {
      name: "ユーザー名",
      handle: "@bench_press100",
      bio: "胸トレが好きです。次はベンチプレス105kgを目指しています。",
      tone: "blue",
      records: "86",
      streak: "12日",
      achievements: "15",
      logs: [
        { date: "5月26日", exercise: "ベンチプレス", detail: "1セット x 1回 / 100kg" },
        { date: "5月24日", exercise: "インクラインプレス", detail: "4セット x 10回 / 32kg" },
      ],
    },
    message: "今日のベンチプレス100kg達成！",
    postedAt: "2時間前",
    likes: 34,
  },
  {
    id: 2,
    author: {
      name: "別のユーザー",
      handle: "@morning_runner",
      bio: "朝ランと脚トレで体力作り。休日は一緒に走れる方を募集中です。",
      tone: "green",
      records: "64",
      streak: "31日",
      achievements: "12",
      logs: [
        { date: "5月26日", exercise: "ランニング", detail: "5.0km / 27分12秒" },
        { date: "5月25日", exercise: "ブルガリアンスクワット", detail: "3セット x 12回 / 20kg" },
      ],
    },
    message: "朝ラン5km完走しました。",
    postedAt: "5時間前",
    likes: 19,
  },
];

const followingPosts: TimelinePost[] = [
  {
    id: 3,
    author: {
      name: "フォロー中のユーザー",
      handle: "@big3_challenge",
      bio: "BIG3の合計500kgを目指して記録更新中。一緒に追い込みましょう。",
      tone: "purple",
      records: "142",
      streak: "9日",
      achievements: "37",
      logs: [
        { date: "5月26日", exercise: "デッドリフト", detail: "3セット x 3回 / 160kg" },
        { date: "5月22日", exercise: "スクワット", detail: "5セット x 5回 / 120kg" },
      ],
    },
    message: "BIG3のトレーニング完了！今日も追い込みました。",
    postedAt: "1時間前",
    likes: 52,
  },
];

export default function Home() {
  const [view, setView] = useState<View>("timeline");
  const [activeTab, setActiveTab] = useState<TimelineTab>("recommended");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const openTimeline = () => {
    setSelectedProfile(null);
    setView("timeline");
  };

  const openMemberProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setView("member");
  };

  return (
    <main className={styles.app}>
      <section className={styles.viewport}>
        {view === "timeline" && (
          <TimelineScreen
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onOpenProfile={openMemberProfile}
          />
        )}
        {view === "quickStart" && <QuickStartScreen />}
        {view === "profile" && <ProfileScreen profile={myProfile} own />}
        {view === "member" && selectedProfile && (
          <ProfileScreen profile={selectedProfile} onBack={openTimeline} />
        )}

        <BottomNav
          activeView={view}
          onTimeline={openTimeline}
          onQuickStart={() => setView("quickStart")}
          onProfile={() => setView("profile")}
        />
        <button className={styles.help} type="button" aria-label="ヘルプを開く">
          ?
        </button>
      </section>
    </main>
  );
}

function TimelineScreen({
  activeTab,
  onSelectTab,
  onOpenProfile,
}: {
  activeTab: TimelineTab;
  onSelectTab: (tab: TimelineTab) => void;
  onOpenProfile: (profile: Profile) => void;
}) {
  const posts = activeTab === "recommended" ? recommendedPosts : followingPosts;

  return (
    <>
      <header className={styles.tabs} aria-label="タイムラインの表示切替">
        <button
          className={activeTab === "recommended" ? styles.activeTab : ""}
          onClick={() => onSelectTab("recommended")}
          type="button"
        >
          おすすめ
        </button>
        <button
          className={activeTab === "following" ? styles.activeTab : ""}
          onClick={() => onSelectTab("following")}
          type="button"
        >
          フォロー中
        </button>
      </header>
      <section className={styles.timeline} aria-label="投稿一覧">
        {posts.map((post) => (
          <article className={styles.post} key={post.id}>
            <button
              className={`${styles.avatar} ${styles[post.author.tone]}`}
              aria-label={`${post.author.name}のプロフィールを見る`}
              onClick={() => onOpenProfile(post.author)}
              type="button"
            >
              <UserIcon />
            </button>
            <div className={styles.postContent}>
              <button
                className={styles.author}
                onClick={() => onOpenProfile(post.author)}
                type="button"
              >
                {post.author.name}
              </button>
              <p>{post.message}</p>
              <div className={styles.postMeta}>
                <time>{post.postedAt}</time>
                <span>いいね {post.likes}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}

function ProfileScreen({
  profile,
  own = false,
  onBack,
}: {
  profile: Profile;
  own?: boolean;
  onBack?: () => void;
}) {
  return (
    <section className={styles.profileScreen}>
      <header className={styles.profileHeader}>
        {onBack ? (
          <button className={styles.back} onClick={onBack} type="button" aria-label="タイムラインに戻る">
            <ArrowIcon />
          </button>
        ) : (
          <span className={styles.headerSpacer} />
        )}
        <h1>プロフィール</h1>
        {own ? <button className={styles.edit} type="button">編集</button> : <span className={styles.headerSpacer} />}
      </header>

      <div className={styles.profileBody}>
        <div className={`${styles.largeAvatar} ${styles[profile.tone]}`}>
          <UserIcon />
        </div>
        <h2>{profile.name}</h2>
        <p className={styles.handle}>{profile.handle}</p>
        <p className={styles.bio}>{profile.bio}</p>

        <div className={styles.stats}>
          <Stat value={profile.records} label="記録数" />
          <Stat value={profile.streak} label="連続日数" />
          <Stat value={profile.achievements} label="達成数" />
        </div>

        <div className={styles.logHeader}>
          <h3>トレーニングログ</h3>
          <span>最近の記録</span>
        </div>
        <div className={styles.logs}>
          {profile.logs.map((log) => (
            <article className={styles.log} key={`${log.date}-${log.exercise}`}>
              <time>{log.date}</time>
              <strong>{log.exercise}</strong>
              <p>{log.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStartScreen() {
  return (
    <section className={styles.quickScreen}>
      <header className={styles.simpleHeader}>
        <h1>クイックスタート</h1>
        <p>今日のトレーニングを記録</p>
      </header>
      <div className={styles.startPanel}>
        <span className={styles.lightning}><BoltIcon /></span>
        <h2>新しいワークアウト</h2>
        <p>種目を選んですぐに記録を開始できます。</p>
        <button className={styles.startButton} type="button">トレーニングを開始</button>
      </div>
      <h2 className={styles.routineTitle}>おすすめメニュー</h2>
      <div className={styles.routines}>
        <button type="button"><strong>胸・肩</strong><span>ベンチプレス / ショルダープレス</span></button>
        <button type="button"><strong>脚</strong><span>スクワット / レッグプレス</span></button>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function BottomNav({
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
  const timelineActive = activeView === "timeline" || activeView === "member";

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

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 10.7 12 3.8l8.5 6.9v9.5H14v-5.4h-4v5.4H3.5z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="7.5" r="4" />
      <path d="M4.5 20v-3.2c0-3.1 3.4-5.1 7.5-5.1s7.5 2 7.5 5.1V20" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m13.2 2.5-8 11h6.1l-.6 8 8.1-11h-6.1z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 4.5 7.5 12 15 19.5M8 12h11" />
    </svg>
  );
}
