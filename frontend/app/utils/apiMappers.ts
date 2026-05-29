import { availableTags } from "../constants/workout";
import type { Profile, ProfileTag, TimelinePost } from "../types/workout";

export type TimelineApiResponse = {
  items: TimelineApiItem[];
  nextCursor?: string | null;
};

export type TimelineApiItem = {
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

export type UserProfileApiResponse = {
  profile?: {
    id: number;
    user_id?: number;
    userId?: number;
    username: string;
    bio?: string;
    training_frequency_days?: number;
    trainingFrequencyDays?: number;
    tags?: Array<{ id: number; label: string }>;
    following?: boolean;
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

const toProfileTags = (tags?: Array<{ id: number; label: string }>) => (
  tags
    ?.map((tag) => tag.label)
    .filter((tag): tag is ProfileTag => availableTags.includes(tag as ProfileTag))
);

export const mapTimelineItemToPost = (item: TimelineApiItem): TimelinePost => {
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
      tags: toProfileTags(item.author.tags),
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

export const mapApiProfileToProfile = (profile: NonNullable<UserProfileApiResponse["profile"]>): Profile => {
  const userID = profile.userId ?? profile.user_id ?? profile.id;

  return {
    userId: userID,
    name: profile.username,
    handle: `@user-${userID}`,
    bio: profile.bio || "プロフィール未設定",
    tone: toneByUserID(userID),
    records: "-",
    streak: "-",
    achievements: "-",
    logs: [],
    tags: toProfileTags(profile.tags),
    inactivityDays: profile.trainingFrequencyDays ?? profile.training_frequency_days,
    isFollowing: profile.following,
  };
};
