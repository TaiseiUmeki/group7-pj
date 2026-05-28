"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import styles from "../page.module.css";
import { availableTags, exercisesByBodyPart } from "../constants/workout";
import type { BodyPart, Connection, DetailedWorkoutInput, Profile, ProfileTag, TimelinePost, TimelineTab, WorkoutSession } from "../types/workout";
import { formatStopwatch, getDaysWithoutPost, getLocalDateTimeInputValue, getWorkoutElapsed } from "../utils/workout";
import { ArrowIcon, ChevronIcon, HeartIcon, PauseIcon, PlayIcon, PlusIcon, StopIcon, UserIcon } from "./icons";

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
  onCreateRecord,
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
  onCreateRecord: () => void;
}) {
  const posts = timelinePosts;

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
        {timelineError ? <p className={styles.emptyState}>{timelineError}</p> : null}
        {loadingTimeline ? <p className={styles.emptyState}>投稿を読み込んでいます...</p> : null}
        {!loadingTimeline && posts.length === 0 ? <p className={styles.emptyState}>表示できる投稿はまだありません。</p> : null}
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

export function ProfileScreen({
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
      <p className={styles.finishNote}>終了すると計測結果を投稿し、タイムラインへ戻ります。</p>
    </section>
  );
}

export function CreateRecordScreen({
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
