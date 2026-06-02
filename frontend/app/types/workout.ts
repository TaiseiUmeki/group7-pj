import type { availableTags } from "../constants/workout";

export type TimelineTab = "recommended" | "following";
export type View = "timeline" | "postDetail" | "quickStart" | "createRecord" | "profile" | "member" | "notifications";
export type Tone = "blue" | "green" | "purple";
export type BodyPart = "胸" | "背中" | "脚" | "肩" | "腕" | "体幹";

export type TrainingLog = {
  id: string;
  postId?: number;
  date: string;
  exercise: string;
  detail: string;
};

export type Badge = {
  title: string;
  description: string;
  earnedAt: string;
  tone: "gold" | "blue" | "green";
};

export type Connection = {
  userId?: number;
  name: string;
  handle: string;
  tone: Tone;
  relation: string;
};

export type ProfileTag = (typeof availableTags)[number];

export type Profile = {
  userId?: number;
  name: string;
  handle: string;
  bio: string;
  tone: Tone;
  records: string;
  streak: string;
  streakDays?: number;
  trainedToday?: boolean;
  achievements: string;
  logs: TrainingLog[];
  badges?: Badge[];
  following?: Connection[];
  followers?: Connection[];
  inactivityDays?: number;
  tags?: ProfileTag[];
  lastPostedAt?: string;
  isFollowing?: boolean;
};

export type TimelinePost = {
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

export type SupportTarget = {
  user: {
    id: number;
    username: string;
  };
  lastTrainedOn: string;
  trainingFrequencyDays: number;
  daysWithoutTraining: number;
};

export type NotificationItem = {
  id: number;
  notificationType: number;
  notificationTypeLabel: string;
  body: string;
  trainingPostId: number | null;
  supportMessageId: number | null;
  isRead: boolean;
  createdAt: string;
};

export type WorkoutSession = {
  startedAt: number;
  activeSince: number | null;
  elapsedBeforePause: number;
};

export type WorkoutRecordResponse = {
  id: number;
};

export type WorkoutRecord = {
  id: number;
  user_id: number;
  record_type: "quick" | "normal" | string;
  exercise_type: string;
  start_time: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
};

export type DetailedWorkoutInput = {
  bodyPart: BodyPart;
  exercise: string;
  startTime: string;
  durationMinutes: number;
  note: string;
};
