"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import styles from "../page.module.css";
import { availableTags, exercisesByBodyPart } from "../constants/workout";
import type { BodyPart, Connection, DetailedWorkoutInput, Profile, ProfileTag, SupportTarget, TimelinePost, TimelineTab, WorkoutSession } from "../types/workout";
import { formatStopwatch, getDaysWithoutPost, getLocalDateTimeInputValue, getWorkoutElapsed } from "../utils/workout";
import { ArrowIcon, ChevronIcon, HeartIcon, PauseIcon, PlayIcon, PlusIcon, StopIcon, UserIcon } from "./icons";

type TourTarget = "create-record" | "support-card" | "follow-card" | "like-button" | "detail-button" | "recommend-card";

type TourStep = {
  target: TourTarget;
  tab: TimelineTab;
  titleJa: string;
  titleEn: string;
  bodyJa: string;
  bodyEn: string;
};

const timelineTourSteps: TourStep[] = [
  {
    target: "create-record",
    tab: "following",
    titleJa: "運動記録を追加",
    titleEn: "Add a workout record",
    bodyJa: "このボタンから今日のトレーニング内容を記録します。",
    bodyEn: "Use this button to create today's workout record.",
  },
  {
    target: "follow-card",
    tab: "following",
    titleJa: "フォローユーザーの投稿",
    titleEn: "Following post card",
    bodyJa: "フォローしているユーザーの運動記録を時系列で確認できます。",
    bodyEn: "Review workout posts from people you follow in timeline order.",
  },
  {
    target: "like-button",
    tab: "following",
    titleJa: "いいねボタン",
    titleEn: "Like button",
    bodyJa: "共感した投稿にはいいねを送り、相手の継続を応援できます。",
    bodyEn: "Send a like to encourage posts that motivate you.",
  },
  {
    target: "detail-button",
    tab: "following",
    titleJa: "トレーニング詳細",
    titleEn: "Card details",
    bodyJa: "詳細画面では実施日時、種目、メモなどを詳しく確認できます。",
    bodyEn: "Open details to see the workout time, exercise, notes, and more.",
  },
  {
    target: "recommend-card",
    tab: "recommended",
    titleJa: "おすすめユーザー",
    titleEn: "Recommendation card",
    bodyJa: "おすすめユーザーを見つけてフォローし、タイムラインを広げましょう。",
    bodyEn: "Find recommended users, follow them, and expand your timeline.",
  },
  {
    target: "support-card",
    tab: "following",
    titleJa: "応援ユーザー",
    titleEn: "Support users",
    bodyJa: "トレーニングが空いているフォロー先に「がんばれ」を送り、再開のきっかけを作れます。",
    bodyEn: "Send encouragement to followed users who have not trained recently and help them restart.",
  },
];

function getTourRect(target: TourTarget, rect: DOMRect) {
  const cardTargets: TourTarget[] = ["support-card", "follow-card", "recommend-card"];
  const isCardTarget = cardTargets.includes(target);
  const viewportMargin = 18;
  const horizontalInset = isCardTarget ? Math.min(18, rect.width / 10) : 0;
  const verticalInset = isCardTarget ? Math.min(8, rect.height / 10) : 0;
  const maxWidth = window.innerWidth - viewportMargin * 2;
  const width = Math.max(32, Math.min(rect.width - horizontalInset * 2, maxWidth));
  const left = Math.min(
    Math.max(rect.left + horizontalInset, viewportMargin),
    window.innerWidth - viewportMargin - width,
  );

  return {
    left,
    top: rect.top + verticalInset,
    width,
    height: Math.max(32, rect.height - verticalInset * 2),
  };
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function TimelineScreen({
  activeTab,
  onSelectTab,
  onOpenProfile,
  onOpenDetail,
  onToggleLike,
  likedPostIDs,
  timelinePosts,
  loadingTimeline,
  timelineError,
  recommendedUsers,
  loadingRecommendations,
  recommendationsError,
  followingRecommendationIDs,
  onFollowRecommendation,
  onCreateRecord,
  supportTargets,
  supportTargetsError,
  onDismissSupportTarget,
  onSupportTarget,
}: {
  activeTab: TimelineTab;
  onSelectTab: (tab: TimelineTab) => void;
  onOpenProfile: (profile: Profile) => void;
  onOpenDetail: (post: TimelinePost) => void;
  onToggleLike: (postID: TimelinePost["id"]) => void;
  likedPostIDs: Array<TimelinePost["id"]>;
  timelinePosts: TimelinePost[];
  loadingTimeline: boolean;
  timelineError: string;
  recommendedUsers: Profile[];
  loadingRecommendations: boolean;
  recommendationsError: string;
  followingRecommendationIDs: number[];
  onFollowRecommendation: (profile: Profile) => void;
  onCreateRecord: () => void;
  supportTargets: SupportTarget[];
  supportTargetsError: string;
  onDismissSupportTarget: (target: SupportTarget) => void;
  onSupportTarget: (target: SupportTarget) => void;
}) {
  const posts = timelinePosts;
  const supportTarget = supportTargets[0];
  const [tourStepIndex, setTourStepIndex] = useState<number | null>(null);
  const [tourRect, setTourRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const tourSteps = supportTargets.length > 0
    ? timelineTourSteps
    : timelineTourSteps.filter((step) => step.target !== "support-card");
  const activeTourStep = tourStepIndex === null ? null : tourSteps[tourStepIndex] ?? null;
  const tourHole = tourRect
    ? {
        left: Math.max(0, tourRect.left - 12),
        top: Math.max(0, tourRect.top - 12),
        right: Math.min(window.innerWidth, tourRect.left + tourRect.width + 12),
        bottom: Math.min(window.innerHeight, tourRect.top + tourRect.height + 12),
      }
    : null;
  const todayLabel = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const getTourClass = (target: TourTarget) => (
    activeTourStep?.target === target ? ` ${styles.tourTarget}` : ""
  );
  const shouldLiftPost = (postIndex: number) => (
    postIndex === 0
    && activeTourStep !== null
    && ["follow-card", "like-button", "detail-button"].includes(activeTourStep.target)
  );

  useEffect(() => {
    if (!activeTourStep || activeTab === activeTourStep.tab) {
      return;
    }

    onSelectTab(activeTourStep.tab);
  }, [activeTab, activeTourStep, onSelectTab]);

  useEffect(() => {
    if (!activeTourStep) {
      setTourRect(null);
      return;
    }

    const updateTourRect = () => {
      const target = document.querySelector(`[data-tour="${activeTourStep.target}"]`);
      if (!target) {
        setTourRect(null);
        return;
      }

      setTourRect(getTourRect(activeTourStep.target, target.getBoundingClientRect()));
    };

    const timeoutID = window.setTimeout(() => {
      document.querySelector(`[data-tour="${activeTourStep.target}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      updateTourRect();
      window.setTimeout(updateTourRect, 420);
    }, 80);

    window.addEventListener("resize", updateTourRect);
    window.addEventListener("scroll", updateTourRect, true);

    return () => {
      window.clearTimeout(timeoutID);
      window.removeEventListener("resize", updateTourRect);
      window.removeEventListener("scroll", updateTourRect, true);
    };
  }, [activeTab, activeTourStep]);

  const startTour = () => setTourStepIndex(0);
  const closeTour = () => setTourStepIndex(null);
  const previousTourStep = () => {
    setTourStepIndex((currentIndex) => {
      if (currentIndex === null || currentIndex === 0) {
        return currentIndex;
      }

      return currentIndex - 1;
    });
  };
  const nextTourStep = () => {
    setTourStepIndex((currentIndex) => {
      if (currentIndex === null) {
        return 0;
      }

      const nextIndex = currentIndex + 1;
      return nextIndex >= tourSteps.length ? null : nextIndex;
    });
  };

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
      <button className={styles.tourStartButton} onClick={startTour} type="button">
        ガイド開始 / Start Tour
      </button>
      <section className={styles.timeline} aria-label="投稿一覧">
        {supportTargets.length > 0 ? (
          <section className={styles.supportPanel} aria-labelledby="support-title">
            <div className={styles.supportPanelHeader}>
              <h2 id="support-title">応援できるフォロー先</h2>
              <span>{supportTargets.length}人</span>
            </div>
            {supportTargetsError ? <p className={styles.supportError}>{supportTargetsError}</p> : null}
            <div className={styles.supportList}>
              {supportTargets.map((target, targetIndex) => (
                <article
                  className={`${styles.supportItem}${targetIndex === 0 ? getTourClass("support-card") : ""}`}
                  data-tour={targetIndex === 0 ? "support-card" : undefined}
                  key={target.user.id}
                >
                  <div className={styles.supportHeader}>
                    <span className={`${styles.avatar} ${styles[toneForSupportTarget(target.user.id)]}`}>
                      <UserIcon />
                    </span>
                    <div>
                      <strong>{target.user.username}</strong>
                      <span>最終トレーニング {target.lastTrainedOn}</span>
                    </div>
                  </div>
                  <dl className={styles.supportStats}>
                    <div>
                      <dt>未実施</dt>
                      <dd>{target.daysWithoutTraining}日</dd>
                    </div>
                    <div>
                      <dt>設定頻度</dt>
                      <dd>{target.trainingFrequencyDays}日ごと</dd>
                    </div>
                  </dl>
                  <div className={styles.supportActions}>
                    <button type="button" onClick={() => onDismissSupportTarget(target)}>
                      あとで
                    </button>
                    <button type="button" onClick={() => onSupportTarget(target)}>
                      がんばれ
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        {false ? (
          <section className={styles.supportPanel} aria-labelledby="support-title">
            <div className={styles.supportHeader}>
              <span className={`${styles.avatar} ${styles[toneForSupportTarget(supportTarget.user.id)]}`}>
                <UserIcon />
              </span>
              <div>
                <h2 id="support-title">応援できるフォロー先</h2>
                <strong>{supportTarget.user.username}</strong>
              </div>
            </div>
            <dl className={styles.supportStats}>
              <div>
                <dt>最後のトレーニング</dt>
                <dd>{supportTarget.lastTrainedOn}</dd>
              </div>
              <div>
                <dt>未実施日数</dt>
                <dd>{supportTarget.daysWithoutTraining}日</dd>
              </div>
              <div>
                <dt>設定頻度</dt>
                <dd>{supportTarget.trainingFrequencyDays}日ごと</dd>
              </div>
            </dl>
            {supportTargetsError ? <p className={styles.supportError}>{supportTargetsError}</p> : null}
            <div className={styles.supportActions}>
              <button type="button" onClick={() => onDismissSupportTarget(supportTarget)}>
                あとで
              </button>
              <button type="button" onClick={() => onSupportTarget(supportTarget)}>
                がんばれ
              </button>
            </div>
          </section>
        ) : null}
        {activeTab === "recommended" ? (
          <section
            className={`${styles.recommendationPanel}${activeTourStep?.target === "recommend-card" ? ` ${styles.tourLift}` : ""}${recommendedUsers.length === 0 ? getTourClass("recommend-card") : ""}`}
            aria-label="おすすめユーザー"
            data-tour={recommendedUsers.length === 0 ? "recommend-card" : undefined}
          >
            <div className={styles.recommendationHeader}>
              <h2>おすすめユーザー</h2>
              <span>今日の5人・{todayLabel}</span>
            </div>
            {recommendationsError ? <p className={styles.emptyState}>{recommendationsError}</p> : null}
            {loadingRecommendations ? <p className={styles.emptyState}>おすすめユーザーを読み込んでいます...</p> : null}
            {!loadingRecommendations && recommendedUsers.length === 0 && !recommendationsError ? (
              <p className={styles.emptyState}>表示できるおすすめユーザーはまだありません。</p>
            ) : null}
            {recommendedUsers.length > 0 ? (
              <div className={styles.recommendationList}>
                {recommendedUsers.map((profile, profileIndex) => {
                  const updating = Boolean(profile.userId && followingRecommendationIDs.includes(profile.userId));
                  return (
                    <article
                      className={`${styles.recommendationItem}${profileIndex === 0 ? getTourClass("recommend-card") : ""}`}
                      data-tour={profileIndex === 0 ? "recommend-card" : undefined}
                      key={profile.userId ?? profile.handle}
                    >
                      <button
                        className={`${styles.avatar} ${styles[profile.tone]}`}
                        aria-label={`${profile.name}のプロフィールを見る`}
                        onClick={() => onOpenProfile(profile)}
                        type="button"
                      >
                        <UserIcon />
                      </button>
                      <div className={styles.recommendationBody}>
                        <button className={styles.author} onClick={() => onOpenProfile(profile)} type="button">
                          {profile.name}
                        </button>
                        <span>{profile.handle}</span>
                        {profile.tags && profile.tags.length > 0 ? (
                          <div className={styles.recommendationTags}>
                            {profile.tags.map((tag) => <span key={tag}>{tag}</span>)}
                          </div>
                        ) : null}
                      </div>
                      <button
                        className={styles.followButton}
                        disabled={updating}
                        onClick={() => onFollowRecommendation(profile)}
                        type="button"
                      >
                        {updating ? "更新中" : profile.isFollowing ? "フォロー解除" : "フォロー"}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}
        {timelineError ? <p className={styles.emptyState}>{timelineError}</p> : null}
        {loadingTimeline ? <p className={styles.emptyState}>投稿を読み込んでいます...</p> : null}
        {!loadingTimeline && posts.length === 0 ? <p className={styles.emptyState}>表示できる投稿はまだありません。</p> : null}
        {posts.map((post, postIndex) => (
          <article
            className={`${styles.post}${shouldLiftPost(postIndex) ? ` ${styles.tourLift}` : ""}${postIndex === 0 ? getTourClass("follow-card") : ""}`}
            data-tour={postIndex === 0 ? "follow-card" : undefined}
            key={post.id}
          >
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
              <span className={`${styles.trainingStatus} ${getTrainingStatusClass(post)}`}>
                {getTrainingStatusText(post)}
              </span>
              <div className={styles.workoutOverview}>
                <strong>{post.exercise}</strong>
                <span>{post.duration}</span>
              </div>
              <p className={styles.summary}>{post.summary}</p>
              <div className={styles.postActions}>
                <button
                  className={`${styles.detailButton}${postIndex === 0 ? getTourClass("detail-button") : ""}`}
                  data-tour={postIndex === 0 ? "detail-button" : undefined}
                  onClick={() => onOpenDetail(post)}
                  type="button"
                >
                  詳細を見る
                  <ChevronIcon />
                </button>
                <button
                  className={`${styles.likeButton} ${likedPostIDs.includes(post.id) ? styles.liked : ""}${postIndex === 0 ? getTourClass("like-button") : ""}`}
                  data-tour={postIndex === 0 ? "like-button" : undefined}
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
      <button
        className={`${styles.createRecordButton}${getTourClass("create-record")}`}
        data-tour="create-record"
        onClick={onCreateRecord}
        type="button"
      >
        <PlusIcon />
        <span>記録を作成</span>
      </button>
      {activeTourStep && tourStepIndex !== null ? (
        <>
          {tourHole ? (
            <>
              <div
                className={styles.tourOverlaySegment}
                style={{ left: 0, top: 0, right: 0, height: tourHole.top }}
                aria-hidden="true"
              />
              <div
                className={styles.tourOverlaySegment}
                style={{ left: 0, top: tourHole.bottom, right: 0, bottom: 0 }}
                aria-hidden="true"
              />
              <div
                className={styles.tourOverlaySegment}
                style={{ left: 0, top: tourHole.top, width: tourHole.left, height: tourHole.bottom - tourHole.top }}
                aria-hidden="true"
              />
              <div
                className={styles.tourOverlaySegment}
                style={{ left: tourHole.right, top: tourHole.top, right: 0, height: tourHole.bottom - tourHole.top }}
                aria-hidden="true"
              />
            </>
          ) : (
            <div className={styles.tourOverlay} aria-hidden="true" />
          )}
          {tourRect ? (
            <div
              className={styles.tourSpot}
              style={{
                left: tourRect.left,
                top: tourRect.top,
                width: tourRect.width,
                height: tourRect.height,
              }}
              aria-hidden="true"
            />
          ) : null}
          <aside className={styles.tourDialog} aria-live="polite" aria-label="サイトガイド">
            <p className={styles.tourProgress}>
              ステップ {tourStepIndex + 1}/{tourSteps.length} / Step {tourStepIndex + 1}/{tourSteps.length}
            </p>
            <h2>
              <span>{activeTourStep.titleJa}</span>
              <span>{activeTourStep.titleEn}</span>
            </h2>
            <p>{activeTourStep.bodyJa}</p>
            <p>{activeTourStep.bodyEn}</p>
            <div className={styles.tourActions}>
              <button onClick={tourStepIndex === 0 ? closeTour : previousTourStep} type="button">
                {tourStepIndex === 0 ? "終了 / Exit" : "戻る / Back"}
              </button>
              <button onClick={nextTourStep} type="button">
                {tourStepIndex === tourSteps.length - 1 ? "完了 / Finish" : "次へ / Next"}
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

function toneForSupportTarget(userID: number): Profile["tone"] {
  const tones: Profile["tone"][] = ["blue", "green", "purple"];
  return tones[Math.abs(userID) % tones.length];
}

function getTrainingStatusText(post: TimelinePost) {
  const streakDays = post.author.streakDays ?? 0;
  return `連続${streakDays}日✨`;
}

function getTrainingStatusClass(post: TimelinePost) {
  const streakDays = post.author.streakDays ?? 0;
  const todayClass = post.author.trainedToday ? ` ${styles.trainedToday}` : "";
  if (streakDays >= 7) {
    return `${styles.streakHot}${todayClass}`;
  }
  if (streakDays >= 3) {
    return `${styles.streakWarm}${todayClass}`;
  }
  if (streakDays >= 1) {
    return `${styles.streakFresh}${todayClass}`;
  }
  return `${styles.done}${todayClass}`;
}

function getProfileLogStatusText(profile: Profile, inactiveDays: number | null) {
  if (!profile.trainedToday && inactiveDays && inactiveDays > 0) {
    return `${inactiveDays}日未実施`;
  }
  const streakDays = profile.streakDays ?? 0;
  return `連続${streakDays}日✨`;
}

function getProfileLogStatusClass(profile: Profile, inactiveDays: number | null) {
  const streakDays = profile.streakDays ?? 0;
  const todayClass = profile.trainedToday ? ` ${styles.trainedToday}` : "";
  if (streakDays >= 7) {
    return `${styles.streakHot}${todayClass}`;
  }
  if (streakDays >= 3) {
    return `${styles.streakWarm}${todayClass}`;
  }
  if (streakDays >= 1) {
    return `${styles.streakFresh}${todayClass}`;
  }

  const daysWithoutTraining = inactiveDays ?? 0;
  if (daysWithoutTraining >= 7) {
    return `${styles.inactiveHot}${todayClass}`;
  }
  if (daysWithoutTraining >= 3) {
    return `${styles.inactiveWarm}${todayClass}`;
  }
  if (daysWithoutTraining >= 1) {
    return `${styles.inactiveFresh}${todayClass}`;
  }
  return `${styles.done}${todayClass}`;
}

export function PostDetailScreen({
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
        <span className={`${styles.trainingStatus} ${getTrainingStatusClass(post)}`}>
          {getTrainingStatusText(post)}
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

export function ProfileScreen({
  profile,
  own = false,
  onBack,
  recordErrorMessage,
  onUpdate,
  onSignout,
  onFollowToggle,
  onOpenConnection,
  onOpenLog,
  followUpdating = false,
}: {
  profile: Profile;
  own?: boolean;
  onBack?: () => void;
  recordErrorMessage?: string;
  onUpdate?: (profile: Profile) => void;
  onSignout?: () => void;
  onFollowToggle?: () => void;
  onOpenConnection?: (connection: Connection) => void;
  onOpenLog?: (postId: number) => void;
  followUpdating?: boolean;
}) {
  const [panel, setPanel] = useState<"summary" | "edit" | "following" | "followers">("summary");
  const [inactiveDays, setInactiveDays] = useState<number | null>(null);

  useEffect(() => {
    setInactiveDays(getDaysWithoutPost(profile.lastPostedAt));
  }, [profile.lastPostedAt]);

  // 自分のプロフィールだけ、設定した日数以上投稿がない場合に休止状態を表示する。
  const isInactive = Boolean(
    own && profile.inactivityDays && inactiveDays !== null && inactiveDays >= profile.inactivityDays,
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
        onOpenConnection={onOpenConnection}
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
        ) : onFollowToggle ? (
          <button className={styles.edit} disabled={followUpdating} onClick={onFollowToggle} type="button">
            {followUpdating ? "更新中" : profile.isFollowing ? "フォロー解除" : "フォロー"}
          </button>
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
          <span className={`${styles.profileLogStatus} ${getProfileLogStatusClass(profile, inactiveDays)}`}>
            {getProfileLogStatusText(profile, inactiveDays)}
          </span>
        </div>
        {recordErrorMessage ? <p className={styles.profileNotice}>{recordErrorMessage}</p> : null}
        <div className={styles.logs}>
          {profile.logs.length > 0 ? (
            profile.logs.map((log) => {
              const content = (
                <>
                  <time>{log.date}</time>
                  <strong>{log.exercise}</strong>
                  <p>{log.detail}</p>
                </>
              );

              return log.postId && onOpenLog ? (
                <button
                  className={styles.log}
                  key={log.id}
                  onClick={() => onOpenLog(log.postId!)}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <article className={styles.log} key={log.id}>
                  {content}
                </article>
              );
            })
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

export function ProfileEditScreen({
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

  // タグの並び順は availableTags の定義順にそろえる。
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

export function ConnectionsScreen({
  people,
  title,
  onBack,
  onOpenConnection,
}: {
  people: Connection[];
  title: string;
  onBack: () => void;
  onOpenConnection?: (connection: Connection) => void;
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
            <button
              className={`${styles.avatar} ${styles[person.tone]}`}
              disabled={!person.userId || !onOpenConnection}
              onClick={() => onOpenConnection?.(person)}
              type="button"
              aria-label={`${person.name}のプロフィールを見る`}
            >
              <UserIcon />
            </button>
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

export function QuickStartScreen({
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

  // タイマー表示だけを定期更新するため、値自体は WorkoutSession から毎回再計算する。
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
      <p className={styles.finishNote}>終了すると計測結果を使って投稿内容を編集できます。</p>
    </section>
  );
}

export function CreateRecordScreen({
  errorMessage,
  posting,
  onBack,
  onSubmit,
  initialStartTime,
  initialDurationMinutes,
}: {
  errorMessage: string;
  posting: boolean;
  onBack: () => void;
  onSubmit: (input: DetailedWorkoutInput) => void;
  initialStartTime?: string;
  initialDurationMinutes?: number;
}) {
  const [bodyPart, setBodyPart] = useState<BodyPart | "">("");
  const [exercise, setExercise] = useState("");
  const [startTime, setStartTime] = useState(initialStartTime ?? getLocalDateTimeInputValue);
  const [durationMinutes, setDurationMinutes] = useState(String(initialDurationMinutes ?? 45));
  const [note, setNote] = useState("");

  // 部位の選択に応じて、種目の選択肢を絞り込む。
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
