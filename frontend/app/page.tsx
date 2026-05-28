"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";
import { BottomNav } from "./components/BottomNav";
import { CreateRecordScreen, PostDetailScreen, ProfileScreen, QuickStartScreen, TimelineScreen } from "./components/screens";
import { exerciseTypeIDs } from "./constants/workout";
import { myProfile } from "./constants/mockData";
import type { DetailedWorkoutInput, Profile, TimelinePost, TimelineTab, View, WorkoutRecord, WorkoutRecordResponse, WorkoutSession } from "./types/workout";
import { formatWorkoutDuration, formatWorkoutLog, formatWorkoutPeriod, getLatestPostedAt, getWorkoutElapsed } from "./utils/workout";

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

      // API 反映後、タイムラインにも即時表示できるようローカル投稿を追加する。
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

      const note = input.note.trim();
      // 投稿成功後は、再取得を待たずに自分のタイムラインへ反映する。
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
