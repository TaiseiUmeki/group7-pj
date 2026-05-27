"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";

type TimelineTab = "recommended" | "following";
type View = "timeline" | "postDetail" | "quickStart" | "createRecord" | "profile" | "member";
type Tone = "blue" | "green" | "purple";
type BodyPart = "胸" | "背中" | "脚" | "肩" | "腕" | "体幹";

type TrainingLog = {
  id: string;
  date: string;
  exercise: string;
  detail: string;
};

type Badge = {
  title: string;
  description: string;
  earnedAt: string;
  tone: "gold" | "blue" | "green";
};

type Connection = {
  name: string;
  handle: string;
  tone: Tone;
  relation: string;
};

const availableTags = [
  "やる気",
  "大会勢",
  "健康維持",
  "ダイエット",
  "筋肥大",
  "パワーリフティング",
  "ボディメイク",
  "初心者",
] as const;

type ProfileTag = (typeof availableTags)[number];

type Profile = {
  name: string;
  handle: string;
  bio: string;
  tone: Tone;
  records: string;
  streak: string;
  achievements: string;
  logs: TrainingLog[];
  badges?: Badge[];
  following?: Connection[];
  followers?: Connection[];
  inactivityDays?: number;
  tags?: ProfileTag[];
  lastPostedAt?: string;
};

type TimelinePost = {
  id: number | string;
  author: Profile;
  didTrain: boolean;
  exercise: string;
  duration: string;
  summary: string;
  detail: string;
  trainedAt: string;
  postedAt: string;
  likes: number;
};

type WorkoutSession = {
  startedAt: number;
  activeSince: number | null;
  elapsedBeforePause: number;
};

type WorkoutRecordResponse = {
  id: number;
};

type WorkoutRecord = {
  id: number;
  user_id: number;
  record_type: "quick" | "normal" | string;
  exercise_type: string;
  start_time: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
};

type DetailedWorkoutInput = {
  bodyPart: BodyPart;
  exercise: string;
  startTime: string;
  durationMinutes: number;
  note: string;
};

const exerciseTypeIDs: Record<BodyPart, number> = {
  胸: 1,
  背中: 2,
  脚: 3,
  肩: 4,
  腕: 5,
  体幹: 6,
};

const exercisesByBodyPart: Record<BodyPart, string[]> = {
  胸: ["ベンチプレス", "インクラインプレス", "ダンベルフライ", "プッシュアップ"],
  背中: ["デッドリフト", "ラットプルダウン", "ベントオーバーロウ", "懸垂"],
  脚: ["スクワット", "レッグプレス", "ブルガリアンスクワット", "レッグカール"],
  肩: ["ショルダープレス", "サイドレイズ", "リアレイズ", "アップライトロウ"],
  腕: ["アームカール", "トライセプスプレスダウン", "ディップス", "ハンマーカール"],
  体幹: ["プランク", "アブローラー", "クランチ", "サイドプランク"],
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
    { id: "my-log-2026-05-21-bench-press", date: "5月21日", exercise: "ベンチプレス", detail: "4セット x 8回 / 82.5kg" },
    { id: "my-log-2026-05-20-squat", date: "5月20日", exercise: "スクワット", detail: "5セット x 5回 / 110kg" },
    { id: "my-log-2026-05-18-deadlift", date: "5月18日", exercise: "デッドリフト", detail: "3セット x 5回 / 130kg" },
  ],
  badges: [
    { title: "継続の達人", description: "14日連続で記録", earnedAt: "5月20日獲得", tone: "gold" },
    { title: "ベンチ100", description: "ベンチプレス100kg達成", earnedAt: "4月18日獲得", tone: "blue" },
    { title: "朝活メンバー", description: "朝トレを10回記録", earnedAt: "3月28日獲得", tone: "green" },
  ],
  following: [
    { name: "佐藤 健", handle: "@big3_challenge", tone: "purple", relation: "相互フォロー" },
    { name: "鈴木 美咲", handle: "@morning_runner", tone: "green", relation: "フォロー中" },
    { name: "田中 涼", handle: "@bench_press100", tone: "blue", relation: "相互フォロー" },
  ],
  followers: [
    { name: "佐藤 健", handle: "@big3_challenge", tone: "purple", relation: "フォロー中" },
    { name: "田中 涼", handle: "@bench_press100", tone: "blue", relation: "フォロー中" },
    { name: "伊藤 葵", handle: "@core_training", tone: "green", relation: "フォローする" },
    { name: "高橋 翔", handle: "@run_and_lift", tone: "purple", relation: "フォローする" },
  ],
  inactivityDays: 3,
  tags: ["やる気", "筋肥大", "初心者"],
  lastPostedAt: "2026-05-21T19:00:00+09:00",
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
        { id: "recommended-1-log-2026-05-26-bench-press", date: "5月26日", exercise: "ベンチプレス", detail: "1セット x 1回 / 100kg" },
        { id: "recommended-1-log-2026-05-24-incline-press", date: "5月24日", exercise: "インクラインプレス", detail: "4セット x 10回 / 32kg" },
      ],
    },
    didTrain: true,
    exercise: "ベンチプレス",
    duration: "45分",
    summary: "100kgを達成。フォームを維持して最後まで押し切れました。",
    detail: "ウォームアップ後、80kg x 5回、90kg x 3回、100kg x 1回。次回は100kgを安定して挙げられるよう補助種目も継続します。",
    trainedAt: "今日 07:10 - 07:55",
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
        { id: "recommended-2-log-2026-05-26-running", date: "5月26日", exercise: "ランニング", detail: "5.0km / 27分12秒" },
        { id: "recommended-2-log-2026-05-25-bulgarian-squat", date: "5月25日", exercise: "ブルガリアンスクワット", detail: "3セット x 12回 / 20kg" },
      ],
    },
    didTrain: true,
    exercise: "ランニング",
    duration: "27分",
    summary: "朝ラン5kmを完走。少しずつペースを戻しています。",
    detail: "5.0kmを27分12秒で完走。前半を抑えて後半にペースアップできました。次は脚トレと組み合わせて継続します。",
    trainedAt: "今日 06:00 - 06:27",
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
        { id: "following-3-log-2026-05-26-deadlift", date: "5月26日", exercise: "デッドリフト", detail: "3セット x 3回 / 160kg" },
        { id: "following-3-log-2026-05-22-squat", date: "5月22日", exercise: "スクワット", detail: "5セット x 5回 / 120kg" },
      ],
    },
    didTrain: true,
    exercise: "デッドリフト",
    duration: "60分",
    summary: "BIG3の日。デッドリフトを中心にしっかり追い込みました。",
    detail: "デッドリフト160kgを3セット x 3回。補助種目としてルーマニアンデッドリフトと体幹トレーニングを実施しました。",
    trainedAt: "今日 18:30 - 19:30",
    postedAt: "1時間前",
    likes: 52,
  },
];

export default function Home() {
  const [view, setView] = useState<View>("timeline");
  const [currentProfile, setCurrentProfile] = useState(myProfile);
  const [activeTab, setActiveTab] = useState<TimelineTab>("following");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedPost, setSelectedPost] = useState<TimelinePost | null>(null);
  const [likedPostIDs, setLikedPostIDs] = useState<Array<TimelinePost["id"]>>([]);
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [completedPosts, setCompletedPosts] = useState<TimelinePost[]>([]);
  const [workoutRecords, setWorkoutRecords] = useState<WorkoutRecord[]>([]);
  const [loadingWorkoutRecords, setLoadingWorkoutRecords] = useState(false);
  const [workoutRecordsError, setWorkoutRecordsError] = useState("");
  const [postingWorkout, setPostingWorkout] = useState(false);
  const [workoutError, setWorkoutError] = useState("");
  const [postingDetailedWorkout, setPostingDetailedWorkout] = useState(false);
  const [detailedWorkoutError, setDetailedWorkoutError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const loadWorkoutRecords = useCallback(async () => {
    const token = window.localStorage.getItem("group7pj_token");

    if (!token) {
      setWorkoutRecords([]);
      setWorkoutRecordsError("");
      return;
    }

    setLoadingWorkoutRecords(true);
    setWorkoutRecordsError("");

    try {
      const response = await fetch(`${apiUrl}/api/workout-records`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as WorkoutRecord[] | { error?: string } | null;
      if (!response.ok || !Array.isArray(payload)) {
        const message = payload && !Array.isArray(payload) && "error" in payload ? payload.error : undefined;
        throw new Error(message || "トレーニング記録を読み込めませんでした。");
      }

      setWorkoutRecords(payload);
    } catch (error) {
      setWorkoutRecordsError(error instanceof Error ? error.message : "トレーニング記録を読み込めませんでした。");
    } finally {
      setLoadingWorkoutRecords(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadWorkoutRecords();
  }, [loadWorkoutRecords]);

  const ownProfile: Profile = {
    ...currentProfile,
    records: loadingWorkoutRecords ? "..." : String(workoutRecords.length),
    logs: workoutRecords.length > 0 ? workoutRecords.map(formatWorkoutLog).slice(0, 3) : [],
    lastPostedAt: getLatestPostedAt(workoutRecords) ?? currentProfile.lastPostedAt,
  };

  const handleSignout = () => {
    window.localStorage.removeItem("group7pj_token");
    document.cookie = "group7pj_token=; path=/; max-age=0; samesite=lax";
    window.location.href = "/login";
  };

  const openTimeline = () => {
    setSelectedProfile(null);
    setSelectedPost(null);
    setActiveTab("following");
    setView("timeline");
  };

  const openMemberProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setView("member");
  };

  const openPostDetail = (post: TimelinePost) => {
    setSelectedPost(post);
    setView("postDetail");
  };

  const toggleLike = (postID: TimelinePost["id"]) => {
    setLikedPostIDs((ids) => (
      ids.includes(postID) ? ids.filter((id) => id !== postID) : [...ids, postID]
    ));
  };

  const startWorkout = () => {
    setWorkoutError("");
    setWorkoutSession((session) => session ?? {
      startedAt: Date.now(),
      activeSince: Date.now(),
      elapsedBeforePause: 0,
    });
    setView("quickStart");
  };

  const openCreateRecord = () => {
    setDetailedWorkoutError("");
    setView("createRecord");
  };

  const toggleWorkoutPause = () => {
    setWorkoutSession((session) => {
      if (!session) {
        return null;
      }

      if (session.activeSince === null) {
        return { ...session, activeSince: Date.now() };
      }

      return {
        ...session,
        activeSince: null,
        elapsedBeforePause: getWorkoutElapsed(session),
      };
    });
  };

  const finishWorkout = async () => {
    if (!workoutSession || postingWorkout) {
      return;
    }

    const elapsedMs = getWorkoutElapsed(workoutSession);
    const durationMinutes = Math.max(1, Math.ceil(elapsedMs / 60000));
    setWorkoutSession({
      ...workoutSession,
      activeSince: null,
      elapsedBeforePause: elapsedMs,
    });

    const token = window.localStorage.getItem("group7pj_token");

    if (!token) {
      setWorkoutError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    setPostingWorkout(true);
    setWorkoutError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiUrl}/api/workout-records`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          record_type: "quick",
          start_time: new Date(workoutSession.startedAt).toISOString(),
          duration_minutes: durationMinutes,
        }),
      });

      const payload = (await response.json().catch(() => null)) as WorkoutRecordResponse | { error?: string } | null;
      if (!response.ok || !payload || !("id" in payload)) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "トレーニング記録を保存できませんでした。");
      }

      setCompletedPosts((posts) => [{
        id: `workout-${payload.id}`,
        author: currentProfile,
        didTrain: true,
        exercise: "クイックスタート",
        duration: formatWorkoutDuration(elapsedMs),
        summary: `トレーニング完了！ ${formatWorkoutDuration(elapsedMs)}取り組みました。`,
        detail: "クイックスタートから記録したトレーニングです。",
        trainedAt: "たった今終了",
        postedAt: "たった今",
        likes: 0,
      }, ...posts]);
      setCurrentProfile((profile) => ({ ...profile, lastPostedAt: new Date().toISOString() }));
      setWorkoutSession(null);
      await loadWorkoutRecords();
      setActiveTab("following");
      openTimeline();
    } catch (error) {
      setWorkoutError(error instanceof Error ? error.message : "トレーニング記録を保存できませんでした。");
    } finally {
      setPostingWorkout(false);
    }
  };

  const createDetailedWorkout = async (input: DetailedWorkoutInput) => {
    if (postingDetailedWorkout) {
      return;
    }

    const token = window.localStorage.getItem("group7pj_token");

    if (!token) {
      setDetailedWorkoutError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    setPostingDetailedWorkout(true);
    setDetailedWorkoutError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const startTime = new Date(input.startTime);
      const endTime = new Date(startTime.getTime() + input.durationMinutes * 60000);
      const response = await fetch(`${apiUrl}/api/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          didTrain: true,
          trainedOn: startTime.toISOString().slice(0, 10),
          startedAt: startTime.toISOString(),
          endedAt: endTime.toISOString(),
          exerciseType: exerciseTypeIDs[input.bodyPart],
          durationMinutes: input.durationMinutes,
          note: input.note.trim() || `${input.bodyPart} / ${input.exercise}`,
          visibility: "followers_and_recommended",
        }),
      });

      const payload = (await response.json().catch(() => null)) as WorkoutRecordResponse | { error?: string } | null;
      if (!response.ok || !payload || !("id" in payload)) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "トレーニング記録を保存できませんでした。");
      }

      const note = input.note.trim();
      setCompletedPosts((posts) => [{
        id: `workout-${payload.id}`,
        author: currentProfile,
        didTrain: true,
        exercise: input.exercise,
        duration: `${input.durationMinutes}分`,
        summary: note || `${input.bodyPart}のトレーニングを記録しました。`,
        detail: note || `${input.bodyPart}を中心に${input.exercise}を実施しました。`,
        trainedAt: formatWorkoutPeriod(input.startTime, input.durationMinutes),
        postedAt: "たった今",
        likes: 0,
      }, ...posts]);
      await loadWorkoutRecords();
      setCurrentProfile((profile) => ({ ...profile, lastPostedAt: new Date().toISOString() }));
      setActiveTab("following");
      openTimeline();
    } catch (error) {
      setDetailedWorkoutError(error instanceof Error ? error.message : "トレーニング記録を保存できませんでした。");
    } finally {
      setPostingDetailedWorkout(false);
    }
  };

  return (
    <main className={styles.app}>
      <section className={styles.viewport}>
        {view === "timeline" && (
          <TimelineScreen
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onOpenProfile={openMemberProfile}
            onOpenDetail={openPostDetail}
            onToggleLike={toggleLike}
            likedPostIDs={likedPostIDs}
            completedPosts={completedPosts}
            onCreateRecord={openCreateRecord}
          />
        )}
        {view === "postDetail" && selectedPost && (
          <PostDetailScreen
            post={selectedPost}
            liked={likedPostIDs.includes(selectedPost.id)}
            onBack={openTimeline}
            onOpenProfile={openMemberProfile}
            onToggleLike={() => toggleLike(selectedPost.id)}
          />
        )}
        {view === "quickStart" && workoutSession && (
          <QuickStartScreen
            session={workoutSession}
            errorMessage={workoutError}
            posting={postingWorkout}
            onTogglePause={toggleWorkoutPause}
            onFinish={finishWorkout}
          />
        )}
        {view === "createRecord" && (
          <CreateRecordScreen
            errorMessage={detailedWorkoutError}
            posting={postingDetailedWorkout}
            onBack={openTimeline}
            onSubmit={createDetailedWorkout}
          />
        )}
        {view === "profile" && (
          <ProfileScreen
            profile={ownProfile}
            own
            onUpdate={setCurrentProfile}
            onSignout={handleSignout}
            recordErrorMessage={workoutRecordsError}
          />
        )}
        {view === "member" && selectedProfile && (
          <ProfileScreen profile={selectedProfile} onBack={openTimeline} />
        )}

        <BottomNav
          activeView={view}
          onTimeline={openTimeline}
          onQuickStart={startWorkout}
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
  onOpenDetail,
  onToggleLike,
  likedPostIDs,
  completedPosts,
  onCreateRecord,
}: {
  activeTab: TimelineTab;
  onSelectTab: (tab: TimelineTab) => void;
  onOpenProfile: (profile: Profile) => void;
  onOpenDetail: (post: TimelinePost) => void;
  onToggleLike: (postID: TimelinePost["id"]) => void;
  likedPostIDs: Array<TimelinePost["id"]>;
  completedPosts: TimelinePost[];
  onCreateRecord: () => void;
}) {
  const posts = activeTab === "recommended" ? recommendedPosts : [...completedPosts, ...followingPosts];

  return (
    <>
      <header className={styles.tabs} aria-label="タイムラインの表示切替">
        <button
          className={activeTab === "following" ? styles.activeTab : ""}
          onClick={() => onSelectTab("following")}
          type="button"
        >
          フォロー中
        </button>
        <button
          className={activeTab === "recommended" ? styles.activeTab : ""}
          onClick={() => onSelectTab("recommended")}
          type="button"
        >
          おすすめ
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
              <div className={styles.authorRow}>
                <button
                  className={styles.author}
                  onClick={() => onOpenProfile(post.author)}
                  type="button"
                >
                  {post.author.name}
                </button>
                <time>{post.postedAt}</time>
              </div>
              <span className={`${styles.trainingStatus} ${post.didTrain ? styles.done : styles.skipped}`}>
                {post.didTrain ? "トレーニング完了" : "今日は休み"}
              </span>
              <div className={styles.workoutOverview}>
                <strong>{post.exercise}</strong>
                <span>{post.duration}</span>
              </div>
              <p className={styles.summary}>{post.summary}</p>
              <div className={styles.postActions}>
                <button className={styles.detailButton} onClick={() => onOpenDetail(post)} type="button">
                  詳細を見る
                  <ChevronIcon />
                </button>
                <button
                  className={`${styles.likeButton} ${likedPostIDs.includes(post.id) ? styles.liked : ""}`}
                  aria-pressed={likedPostIDs.includes(post.id)}
                  aria-label={`${likedPostIDs.includes(post.id) ? "いいねを取り消す" : "いいねする"} 現在${post.likes + (likedPostIDs.includes(post.id) ? 1 : 0)}件`}
                  onClick={() => onToggleLike(post.id)}
                  type="button"
                >
                  <HeartIcon />
                  {post.likes + (likedPostIDs.includes(post.id) ? 1 : 0)}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
      <button className={styles.createRecordButton} onClick={onCreateRecord} type="button">
        <PlusIcon />
        <span>記録を作成</span>
      </button>
    </>
  );
}

function PostDetailScreen({
  post,
  liked,
  onBack,
  onOpenProfile,
  onToggleLike,
}: {
  post: TimelinePost;
  liked: boolean;
  onBack: () => void;
  onOpenProfile: (profile: Profile) => void;
  onToggleLike: () => void;
}) {
  return (
    <section className={styles.detailScreen}>
      <header className={styles.profileHeader}>
        <button className={styles.back} onClick={onBack} type="button" aria-label="タイムラインに戻る">
          <ArrowIcon />
        </button>
        <h1>トレーニング詳細</h1>
        <span className={styles.headerSpacer} />
      </header>
      <article className={styles.detailCard}>
        <div className={styles.detailAuthor}>
          <button
            className={`${styles.avatar} ${styles[post.author.tone]}`}
            aria-label={`${post.author.name}のプロフィールを見る`}
            onClick={() => onOpenProfile(post.author)}
            type="button"
          >
            <UserIcon />
          </button>
          <button className={styles.author} onClick={() => onOpenProfile(post.author)} type="button">
            {post.author.name}
          </button>
          <time>{post.postedAt}</time>
        </div>
        <span className={`${styles.trainingStatus} ${post.didTrain ? styles.done : styles.skipped}`}>
          {post.didTrain ? "トレーニング完了" : "今日は休み"}
        </span>
        <dl className={styles.detailMetrics}>
          <div>
            <dt>種目</dt>
            <dd>{post.exercise}</dd>
          </div>
          <div>
            <dt>時間</dt>
            <dd>{post.duration}</dd>
          </div>
          <div>
            <dt>実施日時</dt>
            <dd>{post.trainedAt}</dd>
          </div>
        </dl>
        <section className={styles.detailNote} aria-label="トレーニングメモ">
          <h2>メモ</h2>
          <p>{post.detail}</p>
        </section>
        <button
          className={`${styles.detailLikeButton} ${liked ? styles.liked : ""}`}
          aria-pressed={liked}
          onClick={onToggleLike}
          type="button"
        >
          <HeartIcon />
          {liked ? "いいね済み" : "いいね"} {post.likes + (liked ? 1 : 0)}
        </button>
      </article>
    </section>
  );
}

function ProfileScreen({
  profile,
  own = false,
  onBack,
  recordErrorMessage,
  onUpdate,
  onSignout,
}: {
  profile: Profile;
  own?: boolean;
  onBack?: () => void;
  recordErrorMessage?: string;
  onUpdate?: (profile: Profile) => void;
  onSignout?: () => void;
}) {
  const [panel, setPanel] = useState<"summary" | "edit" | "following" | "followers">("summary");
  const inactiveDays = getDaysWithoutPost(profile.lastPostedAt);
  const isInactive = Boolean(
    own && profile.inactivityDays && inactiveDays >= profile.inactivityDays,
  );

  if (own && panel === "edit") {
    return (
      <ProfileEditScreen
        profile={profile}
        onBack={() => setPanel("summary")}
        onSave={(updatedProfile) => {
          onUpdate?.(updatedProfile);
          setPanel("summary");
        }}
      />
    );
  }

  if (own && (panel === "following" || panel === "followers")) {
    const people = panel === "following" ? profile.following ?? [] : profile.followers ?? [];
    return (
      <ConnectionsScreen
        people={people}
        title={panel === "following" ? "フォロー" : "フォロワー"}
        onBack={() => setPanel("summary")}
      />
    );
  }

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
        {own ? (
          <button className={styles.edit} onClick={() => setPanel("edit")} type="button">編集</button>
        ) : (
          <span className={styles.headerSpacer} />
        )}
      </header>

      <div className={styles.profileBody}>
        <div className={`${styles.largeAvatar} ${styles[profile.tone]}`}>
          <UserIcon />
        </div>
        <h2>{profile.name}</h2>
        <p className={styles.handle}>{profile.handle}</p>
        <p className={styles.bio}>{profile.bio}</p>

        {own && ((profile.tags?.length ?? 0) > 0 || isInactive) ? (
          <section className={styles.profilePreferences} aria-label="プロフィールタグと状態">
            {(profile.tags?.length ?? 0) > 0 ? (
              <div className={styles.profileTags}>
                {profile.tags?.map((tag) => <span key={tag}>#{tag}</span>)}
              </div>
            ) : null}
            {isInactive ? <p className={styles.inactiveStatus}>前回のトレーニングから {inactiveDays}日</p> : null}
          </section>
        ) : null}

        {own ? (
          <div className={styles.socialStats} aria-label="フォロー情報">
            <button onClick={() => setPanel("following")} type="button">
              <strong>{profile.following?.length ?? 0}</strong>
              <span>フォロー</span>
            </button>
            <button onClick={() => setPanel("followers")} type="button">
              <strong>{profile.followers?.length ?? 0}</strong>
              <span>フォロワー</span>
            </button>
          </div>
        ) : null}

        <div className={styles.stats}>
          <Stat value={profile.records} label="記録数" />
          <Stat value={profile.streak} label="連続日数" />
          <Stat value={profile.achievements} label="達成数" />
        </div>

        {own ? (
          <section className={styles.badges} aria-label="自分のバッジ">
            <div className={styles.logHeader}>
              <h3>自分のバッジ</h3>
              <span>{profile.badges?.length ?? 0}個獲得</span>
            </div>
            <div className={styles.badgeGrid}>
              {profile.badges?.map((badge) => (
                <article className={styles.badgeCard} key={badge.title}>
                  <span className={`${styles.badgeMark} ${styles[badge.tone]}`}>★</span>
                  <strong>{badge.title}</strong>
                  <p>{badge.description}</p>
                  <small>{badge.earnedAt}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className={styles.logHeader}>
          <h3>{own ? "自分のログ" : "トレーニングログ"}</h3>
          <span>最近の記録</span>
        </div>
        {recordErrorMessage ? <p className={styles.profileNotice}>{recordErrorMessage}</p> : null}
        <div className={styles.logs}>
          {profile.logs.length > 0 ? (
            profile.logs.map((log) => (
              <article className={styles.log} key={log.id}>
                <time>{log.date}</time>
                <strong>{log.exercise}</strong>
                <p>{log.detail}</p>
              </article>
            ))
          ) : (
            <p className={styles.emptyState}>まだトレーニング記録がありません。</p>
          )}
        </div>

        {own && onSignout ? (
          <button className={styles.signoutButton} onClick={onSignout} type="button">
            サインアウト
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ProfileEditScreen({
  profile,
  onBack,
  onSave,
}: {
  profile: Profile;
  onBack: () => void;
  onSave: (profile: Profile) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [inactivityDays, setInactivityDays] = useState(String(profile.inactivityDays ?? 3));
  const [tags, setTags] = useState<ProfileTag[]>(profile.tags ?? []);

  const toggleTag = (tag: ProfileTag) => {
    setTags((selectedTags) => (
      selectedTags.includes(tag)
        ? selectedTags.filter((selectedTag) => selectedTag !== tag)
        : availableTags.filter((availableTag) => [...selectedTags, tag].includes(availableTag))
    ));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...profile,
      name: name.trim(),
      bio: bio.trim(),
      inactivityDays: Number(inactivityDays),
      tags,
    });
  };

  return (
    <section className={styles.profileScreen}>
      <header className={styles.profileHeader}>
        <button className={styles.back} onClick={onBack} type="button" aria-label="プロフィールに戻る">
          <ArrowIcon />
        </button>
        <h1>プロフィール編集</h1>
        <span className={styles.headerSpacer} />
      </header>
      <form className={styles.profileEditor} onSubmit={handleSubmit}>
        <div className={`${styles.largeAvatar} ${styles[profile.tone]}`}>
          <UserIcon />
        </div>
        <label className={styles.formField}>
          <span>表示名</span>
          <input maxLength={30} onChange={(event) => setName(event.target.value)} required value={name} />
        </label>
        <label className={styles.formField}>
          <span>自己紹介</span>
          <textarea maxLength={160} onChange={(event) => setBio(event.target.value)} required rows={4} value={bio} />
        </label>
        <label className={styles.formField}>
          <span>トレーニング頻度</span>
          <div className={styles.daysField}>
            <input
              min="1"
              onChange={(event) => setInactivityDays(event.target.value)}
              required
              type="number"
              value={inactivityDays}
            />
            <span>日間隔</span>
          </div>
        </label>
        <fieldset className={styles.tagSelector}>
          <legend>タグ</legend>
          <div>
            {availableTags.map((tag) => (
              <button
                aria-pressed={tags.includes(tag)}
                className={tags.includes(tag) ? styles.selectedTag : ""}
                key={tag}
                onClick={() => toggleTag(tag)}
                type="button"
              >
                #{tag}
              </button>
            ))}
          </div>
        </fieldset>
        <button className={styles.submitRecordButton} type="submit">変更を保存</button>
      </form>
    </section>
  );
}

function ConnectionsScreen({
  people,
  title,
  onBack,
}: {
  people: Connection[];
  title: string;
  onBack: () => void;
}) {
  return (
    <section className={styles.profileScreen}>
      <header className={styles.profileHeader}>
        <button className={styles.back} onClick={onBack} type="button" aria-label="プロフィールに戻る">
          <ArrowIcon />
        </button>
        <h1>{title}</h1>
        <span className={styles.headerSpacer} />
      </header>
      <div className={styles.connections}>
        <p className={styles.connectionCount}>{people.length}人</p>
        {people.map((person) => (
          <article className={styles.connection} key={person.handle}>
            <div className={`${styles.avatar} ${styles[person.tone]}`}>
              <UserIcon />
            </div>
            <div>
              <strong>{person.name}</strong>
              <span>{person.handle}</span>
            </div>
            <small>{person.relation}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuickStartScreen({
  session,
  errorMessage,
  posting,
  onTogglePause,
  onFinish,
}: {
  session: WorkoutSession;
  errorMessage: string;
  posting: boolean;
  onTogglePause: () => void;
  onFinish: () => void;
}) {
  const [, refreshClock] = useState(0);
  const running = session.activeSince !== null;
  const elapsedMs = getWorkoutElapsed(session);

  useEffect(() => {
    if (!running) {
      return;
    }

    const intervalID = window.setInterval(() => {
      refreshClock((ticks) => ticks + 1);
    }, 250);

    return () => window.clearInterval(intervalID);
  }, [running]);

  return (
    <section className={styles.quickScreen}>
      <header className={styles.workoutHeader}>
        <p>QUICK START</p>
        <h1>トレーニング中</h1>
      </header>
      <div className={styles.timerPanel}>
        <p className={`${styles.timerState} ${running ? styles.running : styles.paused}`}>
          <span />
          {running ? "計測中" : "一時停止中"}
        </p>
        <time className={styles.timerClock}>{formatStopwatch(elapsedMs)}</time>
        <p className={styles.timerDescription}>
          {running ? "トレーニング時間を記録しています" : "再開すると計測を続けます"}
        </p>
      </div>
      <div className={styles.workoutActions}>
        <button className={styles.pauseButton} onClick={onTogglePause} type="button" disabled={posting}>
          {running ? <PauseIcon /> : <PlayIcon />}
          {running ? "一時停止" : "再開"}
        </button>
        <button className={styles.finishButton} onClick={onFinish} type="button" disabled={posting}>
          <StopIcon />
          {posting ? "投稿中..." : "トレーニング終了"}
        </button>
      </div>
      {errorMessage ? <p className={styles.workoutError} role="alert">{errorMessage}</p> : null}
      <p className={styles.finishNote}>終了すると計測結果を投稿し、タイムラインへ戻ります。</p>
    </section>
  );
}

function CreateRecordScreen({
  errorMessage,
  posting,
  onBack,
  onSubmit,
}: {
  errorMessage: string;
  posting: boolean;
  onBack: () => void;
  onSubmit: (input: DetailedWorkoutInput) => void;
}) {
  const [bodyPart, setBodyPart] = useState<BodyPart | "">("");
  const [exercise, setExercise] = useState("");
  const [startTime, setStartTime] = useState(getLocalDateTimeInputValue);
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [note, setNote] = useState("");

  const availableExercises = bodyPart ? exercisesByBodyPart[bodyPart] : [];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!bodyPart || !exercise) {
      return;
    }

    onSubmit({
      bodyPart,
      exercise,
      startTime,
      durationMinutes: Number(durationMinutes),
      note,
    });
  };

  return (
    <section className={styles.createScreen}>
      <header className={styles.profileHeader}>
        <button className={styles.back} onClick={onBack} type="button" aria-label="タイムラインに戻る">
          <ArrowIcon />
        </button>
        <h1>記録を作成</h1>
        <span className={styles.headerSpacer} />
      </header>
      <form className={styles.recordForm} onSubmit={handleSubmit}>
        <div className={styles.formIntro}>
          <p>DETAIL RECORD</p>
          <h2>トレーニング内容を記録</h2>
          <span>クイックスタートより詳しく、行ったメニューや振り返りを残せます。</span>
        </div>

        <label className={styles.formField}>
          <span>行なった日時</span>
          <input
            onChange={(event) => setStartTime(event.target.value)}
            required
            type="datetime-local"
            value={startTime}
          />
        </label>

        <label className={styles.formField}>
          <span>行なった時間</span>
          <div className={styles.durationField}>
            <input
              min="1"
              onChange={(event) => setDurationMinutes(event.target.value)}
              required
              type="number"
              value={durationMinutes}
            />
            <span>分</span>
          </div>
        </label>

        <div className={styles.formColumns}>
          <label className={styles.formField}>
            <span>部位</span>
            <select
              onChange={(event) => {
                setBodyPart(event.target.value as BodyPart | "");
                setExercise("");
              }}
              required
              value={bodyPart}
            >
              <option value="">選択してください</option>
              {Object.keys(exercisesByBodyPart).map((part) => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
          </label>
          <label className={styles.formField}>
            <span>トレーニング種目</span>
            <select
              disabled={!bodyPart}
              onChange={(event) => setExercise(event.target.value)}
              required
              value={exercise}
            >
              <option value="">{bodyPart ? "選択してください" : "先に部位を選択"}</option>
              {availableExercises.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.formField}>
          <span>その他のメモ <small>任意</small></span>
          <textarea
            maxLength={400}
            onChange={(event) => setNote(event.target.value)}
            placeholder="重量、回数、達成したこと、次回試したいことなど"
            rows={5}
            value={note}
          />
        </label>

        {errorMessage ? <p className={styles.workoutError} role="alert">{errorMessage}</p> : null}
        <button className={styles.submitRecordButton} disabled={posting} type="submit">
          {posting ? "投稿中..." : "タイムラインに投稿する"}
        </button>
      </form>
    </section>
  );
}

function getWorkoutElapsed(session: WorkoutSession) {
  if (session.activeSince === null) {
    return session.elapsedBeforePause;
  }

  return session.elapsedBeforePause + Date.now() - session.activeSince;
}

function formatStopwatch(elapsedMs: number) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((unit) => unit.toString().padStart(2, "0")).join(":");
}

function formatWorkoutDuration(elapsedMs: number) {
  const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}秒`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}分${seconds}秒` : `${minutes}分`;
}

function getLocalDateTimeInputValue() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function formatWorkoutPeriod(startTime: string, durationMinutes: number) {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

function formatWorkoutLog(record: WorkoutRecord): TrainingLog {
  const start = new Date(record.start_time);
  const date = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(start);

  const exercise = record.record_type === "quick"
    ? "クイックスタート"
    : record.exercise_type || "トレーニング記録";

  const detail = record.record_type === "quick"
    ? `${record.duration_minutes}分のクイック記録`
    : `${record.exercise_type || "詳細未設定"} / ${record.duration_minutes}分`;

  return {
    id: `workout-${record.id}`,
    date,
    exercise,
    detail,
  };
}

function getDaysWithoutPost(lastPostedAt?: string) {
  if (!lastPostedAt) {
    return 0;
  }

  const lastPostDate = new Date(lastPostedAt);
  if (Number.isNaN(lastPostDate.getTime())) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastPostDate.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((today.getTime() - lastPostDate.getTime()) / 86400000));
}

function getLatestPostedAt(records: WorkoutRecord[]) {
  return records.reduce<string | undefined>((latest, record) => (
    !latest || new Date(record.created_at) > new Date(latest) ? record.created_at : latest
  ), undefined);
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

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.5 5.5v13M16.5 5.5v13" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 5.5 11 6.5-11 6.5z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6.5" y="6.5" width="11" height="11" rx="1" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5.5 6.5 6.5L9 18.5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 8.8c0 5.5-8 10.4-8 10.4S4 14.3 4 8.8a4.4 4.4 0 0 1 8-2.5 4.4 4.4 0 0 1 8 2.5Z" />
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
