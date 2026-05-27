import type { TrainingLog, WorkoutRecord, WorkoutSession } from "../types/workout";

// 一時停止中の時間を除いた、実際のトレーニング経過時間を返す。
export function getWorkoutElapsed(session: WorkoutSession) {
  if (session.activeSince === null) {
    return session.elapsedBeforePause;
  }

  return session.elapsedBeforePause + Date.now() - session.activeSince;
}

export function formatStopwatch(elapsedMs: number) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((unit) => unit.toString().padStart(2, "0")).join(":");
}

export function formatWorkoutDuration(elapsedMs: number) {
  const totalSeconds = Math.max(1, Math.floor(elapsedMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}秒`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}分${seconds}秒` : `${minutes}分`;
}

// datetime-local input がそのまま読めるローカル時刻の文字列を作る。
export function getLocalDateTimeInputValue() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

// 投稿詳細に表示する「開始 - 終了」の時間帯を整形する。
export function formatWorkoutPeriod(startTime: string, durationMinutes: number) {
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

// API のトレーニング記録を、プロフィール画面のログ表示形式に変換する。
export function formatWorkoutLog(record: WorkoutRecord): TrainingLog {
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

// 最後の投稿から今日までの日数を、日付単位で計算する。
export function getDaysWithoutPost(lastPostedAt?: string) {
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

// 記録一覧から最新の投稿日時を取り出す。
export function getLatestPostedAt(records: WorkoutRecord[]) {
  return records.reduce<string | undefined>((latest, record) => (
    !latest || new Date(record.created_at) > new Date(latest) ? record.created_at : latest
  ), undefined);
}
