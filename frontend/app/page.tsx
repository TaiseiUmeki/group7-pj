"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./page.module.css";
import { BottomNav } from "./components/BottomNav";
import { CreateRecordScreen, PostDetailScreen, ProfileScreen, QuickStartScreen, TimelineScreen } from "./components/screens";
import { availableTags, exerciseTypeIDs } from "./constants/workout";
import { myProfile } from "./constants/mockData";
import type { DetailedWorkoutInput, Profile, ProfileTag, TimelinePost, TimelineTab, View, WorkoutRecord, WorkoutRecordResponse, WorkoutSession } from "./types/workout";
import { formatWorkoutLog, getLatestPostedAt, getWorkoutElapsed } from "./utils/workout";

type TimelineApiResponse = {
  items: TimelineApiItem[];
  nextCursor?: string | null;
};

type TimelineApiItem = {
  id: number;
  didTrain: boolean;
  trainedOn: string;
  startedAt?: string;
  endedAt?: string;
  exerciseType?: number;
  exerciseTypeLabel?: string;
  durationMinutes?: number;
  note?: string;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string;
  author: {
    id: number;
    username: string;
    bio?: string;
    trainingFrequencyDays?: number;
    tags?: Array<{ id: number; label: string }>;
  };
};

type UserProfileApiResponse = {
  profile?: {
    id: number;
    user_id?: number;
    userId?: number;
    username: string;
    bio?: string;
    training_frequency_days?: number;
    trainingFrequencyDays?: number;
    tags?: Array<{ id: number; label: string }>;
  };
};

const toneByUserID = (userID: number): Profile["tone"] => {
  const tones: Profile["tone"][] = ["blue", "green", "purple"];
  return tones[Math.abs(userID) % tones.length];
};

const formatDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
};

const formatPostTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(date);
};

const formatTimelinePeriod = (post: TimelineApiItem) => {
  if (post.startedAt && post.endedAt) {
    return `${formatDateLabel(post.startedAt)} ${formatPostTime(post.startedAt)} - ${formatPostTime(post.endedAt)}`;
  }
  if (post.startedAt) {
    return `${formatDateLabel(post.startedAt)} ${formatPostTime(post.startedAt)}`;
  }
  return formatDateLabel(post.trainedOn);
};

const formatPostedAt = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) {
    return "たった今";
  }
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}時間前`;
  }
  return `${Math.floor(diffHours / 24)}日前`;
};

const mapTimelineItemToPost = (item: TimelineApiItem): TimelinePost => {
  const exercise = item.exerciseTypeLabel || "トレーニング";
  const duration = item.durationMinutes ? `${item.durationMinutes}分` : "時間未記録";
  const note = item.note?.trim();

  return {
    id: item.id,
    author: {
      userId: item.author.id,
      name: item.author.username,
      handle: `@user-${item.author.id}`,
      bio: item.author.bio || "プロフィール未設定",
      tone: toneByUserID(item.author.id),
      records: "-",
      streak: "-",
      achievements: "-",
      logs: [],
      tags: item.author.tags
        ?.map((tag) => tag.label)
        .filter((tag): tag is ProfileTag => availableTags.includes(tag as ProfileTag)),
      inactivityDays: item.author.trainingFrequencyDays,
    },
    didTrain: item.didTrain,
    exercise,
    duration,
    summary: note || (item.didTrain ? `${exercise}のトレーニングを記録しました。` : "今日は休みとして記録しました。"),
    detail: note || (item.didTrain ? `${exercise}を${duration}実施しました。` : "トレーニングを実施しなかった日の記録です。"),
    trainedAt: formatTimelinePeriod(item),
    postedAt: formatPostedAt(item.createdAt),
    likes: item.likedByMe ? Math.max(0, item.likeCount - 1) : item.likeCount,
  };
};

const mapApiProfileToProfile = (profile: NonNullable<UserProfileApiResponse["profile"]>): Profile => ({
  userId: profile.userId ?? profile.user_id,
  name: profile.username,
  handle: `@user-${profile.userId ?? profile.user_id ?? profile.id}`,
  bio: profile.bio || "プロフィール未設定",
  tone: toneByUserID(profile.userId ?? profile.user_id ?? profile.id),
  records: "-",
  streak: "-",
  achievements: "-",
  logs: [],
  tags: profile.tags
    ?.map((tag) => tag.label)
    .filter((tag): tag is ProfileTag => availableTags.includes(tag as ProfileTag)),
  inactivityDays: profile.trainingFrequencyDays ?? profile.training_frequency_days,
});

const postIDFromPathname = (pathname: string) => {
  const match = pathname.match(/^\/posts\/(\d+)$/);
  return match ? Number(match[1]) : null;
};

const userIDFromPathname = (pathname: string) => {
  const match = pathname.match(/^\/users\/(\d+)$/);
  return match ? Number(match[1]) : null;
};

const viewFromPathname = (pathname: string): View => {
  if (postIDFromPathname(pathname) !== null) {
    return "postDetail";
  }
  if (userIDFromPathname(pathname) !== null) {
    return "member";
  }
  switch (pathname) {
    case "/profile":
      return "profile";
    case "/posts/new":
      return "createRecord";
    case "/quick-start":
      return "quickStart";
    default:
      return "timeline";
  }
};

export default function Home() {
  const pathname = usePathname();
  const router = useRouter();
  const [view, setView] = useState<View>(() => viewFromPathname(pathname));
  const [currentProfile, setCurrentProfile] = useState(myProfile);
  const [activeTab, setActiveTab] = useState<TimelineTab>("following");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedPost, setSelectedPost] = useState<TimelinePost | null>(null);
  const [likedPostIDs, setLikedPostIDs] = useState<Array<TimelinePost["id"]>>([]);
  const [timelinePosts, setTimelinePosts] = useState<Record<TimelineTab, TimelinePost[]>>({
    following: [],
    recommended: [],
  });
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [workoutRecords, setWorkoutRecords] = useState<WorkoutRecord[]>([]);
  const [loadingWorkoutRecords, setLoadingWorkoutRecords] = useState(false);
  const [workoutRecordsError, setWorkoutRecordsError] = useState("");
  const [postingWorkout, setPostingWorkout] = useState(false);
  const [workoutError, setWorkoutError] = useState("");
  const [postingDetailedWorkout, setPostingDetailedWorkout] = useState(false);
  const [detailedWorkoutError, setDetailedWorkoutError] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const loadPostDetail = useCallback(async (postID: number) => {
    const token = window.localStorage.getItem("group7pj_token");
    if (!token) {
      setDetailError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    setDetailError("");
    try {
      const response = await fetch(`${apiUrl}/api/posts/${postID}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as TimelineApiItem | { error?: string } | null;
      if (!response.ok || !payload || !("id" in payload)) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "投稿詳細を読み込めませんでした。");
      }
      setSelectedPost(mapTimelineItemToPost(payload));
      setLikedPostIDs((ids) => (payload.likedByMe && !ids.includes(payload.id) ? [...ids, payload.id] : ids));
    } catch (error) {
      setSelectedPost(null);
      setDetailError(error instanceof Error ? error.message : "投稿詳細を読み込めませんでした。");
    }
  }, [apiUrl]);

  const loadMemberProfile = useCallback(async (userID: number) => {
    const token = window.localStorage.getItem("group7pj_token");
    if (!token) {
      setDetailError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    setDetailError("");
    try {
      const response = await fetch(`${apiUrl}/api/users/${userID}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as UserProfileApiResponse | { error?: string } | null;
      if (!response.ok || !payload || !("profile" in payload) || !payload.profile) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "プロフィールを読み込めませんでした。");
      }
      setSelectedProfile(mapApiProfileToProfile(payload.profile));
    } catch (error) {
      setSelectedProfile(null);
      setDetailError(error instanceof Error ? error.message : "プロフィールを読み込めませんでした。");
    }
  }, [apiUrl]);

  useEffect(() => {
    setSelectedProfile(null);
    setSelectedPost(null);
    setDetailError("");
    setView(viewFromPathname(pathname));
  }, [pathname]);

  useEffect(() => {
    const postID = postIDFromPathname(pathname);
    if (postID !== null) {
      void loadPostDetail(postID);
      return;
    }

    const userID = userIDFromPathname(pathname);
    if (userID !== null) {
      void loadMemberProfile(userID);
    }
  }, [loadMemberProfile, loadPostDetail, pathname]);

  useEffect(() => {
    if (view === "quickStart" && !workoutSession) {
      setWorkoutError("");
      setWorkoutSession({
        startedAt: Date.now(),
        activeSince: Date.now(),
        elapsedBeforePause: 0,
      });
    }
  }, [view, workoutSession]);

  const loadTimeline = useCallback(async (source: TimelineTab) => {
    const token = window.localStorage.getItem("group7pj_token");

    if (!token) {
      setTimelinePosts((posts) => ({ ...posts, [source]: [] }));
      setTimelineError("");
      return;
    }

    setLoadingTimeline(true);
    setTimelineError("");

    try {
      const response = await fetch(`${apiUrl}/api/timeline?source=${source}&limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as TimelineApiResponse | { error?: string } | null;
      if (!response.ok || !payload || !("items" in payload)) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "タイムラインを読み込めませんでした。");
      }

      setTimelinePosts((posts) => ({
        ...posts,
        [source]: payload.items.map(mapTimelineItemToPost),
      }));
      setLikedPostIDs((ids) => {
        const next = new Set(ids);
        for (const item of payload.items) {
          if (item.likedByMe) {
            next.add(item.id);
          }
        }
        return Array.from(next);
      });
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : "タイムラインを読み込めませんでした。");
    } finally {
      setLoadingTimeline(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    const token = window.localStorage.getItem("group7pj_token");
    if (!token) {
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/me/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = (await response.json().catch(() => null)) as {
          profileCompleted?: boolean;
          profile?: {
            username?: string;
            bio?: string;
            training_frequency_days?: number;
            tags?: Array<{ id: number; label: string }>;
          } | null;
        } | null;

        if (!response.ok || !payload) {
          return;
        }
        if (!payload.profileCompleted) {
          window.location.href = "/profile-setup";
          return;
        }
        if (payload.profile) {
          setCurrentProfile((profile) => ({
            ...profile,
            name: payload.profile?.username || profile.name,
            bio: payload.profile?.bio || profile.bio,
            inactivityDays: payload.profile?.training_frequency_days ?? profile.inactivityDays,
            tags: payload.profile?.tags
              ?.map((tag) => tag.label)
              .filter((tag): tag is (typeof availableTags)[number] => availableTags.includes(tag as (typeof availableTags)[number])) ?? profile.tags,
          }));
        }
      } catch {
        // プロフィール取得に失敗しても、既存の画面表示は妨げない。
      }
    };

    void loadProfile();
  }, [apiUrl]);

  // ログイン済みユーザーのトレーニング記録をサーバーから取得する。
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

  useEffect(() => {
    void loadTimeline(activeTab);
  }, [activeTab, loadTimeline]);

  // プロフィール表示用に、サーバーから取得した記録数と最新ログを反映する。
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
    router.push("/");
  };

  const openMemberProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setView("member");
    if (profile.userId) {
      router.push(`/users/${profile.userId}`);
    }
  };

  const openPostDetail = (post: TimelinePost) => {
    setSelectedPost(post);
    setView("postDetail");
    router.push(`/posts/${post.id}`);
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
    router.push("/quick-start");
  };

  const openCreateRecord = () => {
    setDetailedWorkoutError("");
    setView("createRecord");
    router.push("/posts/new");
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

    // 経過時間を分単位に丸めて、クイック記録として保存する。
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

      setCurrentProfile((profile) => ({ ...profile, lastPostedAt: new Date().toISOString() }));
      setWorkoutSession(null);
      await loadWorkoutRecords();
      setView("profile");
      router.push("/profile");
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
      // 入力された開始時刻と所要時間から、API に渡す終了時刻を計算する。
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

      await loadWorkoutRecords();
      setCurrentProfile((profile) => ({ ...profile, lastPostedAt: new Date().toISOString() }));
      setView("profile");
      router.push("/profile");
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
            timelinePosts={timelinePosts[activeTab]}
            loadingTimeline={loadingTimeline}
            timelineError={timelineError}
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
        {view === "postDetail" && !selectedPost && (
          <p className={styles.emptyState}>{detailError || "投稿詳細を読み込んでいます..."}</p>
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
        {view === "member" && !selectedProfile && (
          <p className={styles.emptyState}>{detailError || "プロフィールを読み込んでいます..."}</p>
        )}

        <BottomNav
          activeView={view}
          onTimeline={openTimeline}
          onQuickStart={startWorkout}
          onProfile={() => {
            setView("profile");
            router.push("/profile");
          }}
        />
        <button className={styles.help} type="button" aria-label="ヘルプを開く">
          ?
        </button>
      </section>
    </main>
  );
}
