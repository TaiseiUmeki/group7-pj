"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { ProfileScreen } from "../components/screens";
import { availableTags } from "../constants/workout";
import { myProfile } from "../constants/mockData";
import type { Connection, Profile, WorkoutRecord } from "../types/workout";
import { formatWorkoutLog, getLatestPostedAt } from "../utils/workout";

type ConnectionsResponse = {
  items: Array<{
    userId: number;
    username: string;
    handle: string;
    relation: string;
  }>;
};

const toneByUserID = (userID: number): Connection["tone"] => {
  const tones: Connection["tone"][] = ["blue", "green", "purple"];
  return tones[Math.abs(userID) % tones.length];
};

const mapConnection = (item: ConnectionsResponse["items"][number]): Connection => ({
  userId: item.userId,
  name: item.username,
  handle: item.handle,
  tone: toneByUserID(item.userId),
  relation: item.relation,
});

export default function ProfilePage() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const [currentProfile, setCurrentProfile] = useState<Profile>(myProfile);
  const [workoutRecords, setWorkoutRecords] = useState<WorkoutRecord[]>([]);
  const [loadingWorkoutRecords, setLoadingWorkoutRecords] = useState(false);
  const [workoutRecordsError, setWorkoutRecordsError] = useState("");
  const [connectionsError, setConnectionsError] = useState("");

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
            streak_days?: number;
            trained_today?: boolean;
            last_workout_date?: string;
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
          const streakDays = payload.profile.streak_days ?? 0;
          setCurrentProfile((profile) => ({
            ...profile,
            name: payload.profile?.username || profile.name,
            bio: payload.profile?.bio || profile.bio,
            inactivityDays: payload.profile?.training_frequency_days ?? profile.inactivityDays,
            streak: `${streakDays}日`,
            streakDays,
            trainedToday: payload.profile?.trained_today ?? false,
            lastPostedAt: payload.profile?.last_workout_date
              ? `${payload.profile.last_workout_date}T00:00:00`
              : profile.lastPostedAt,
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

  const loadConnections = useCallback(async () => {
    const token = window.localStorage.getItem("group7pj_token");

    if (!token) {
      setConnectionsError("");
      return;
    }

    setConnectionsError("");

    try {
      const [followingResponse, followersResponse] = await Promise.all([
        fetch(`${apiUrl}/api/me/following`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${apiUrl}/api/me/followers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const followingPayload = (await followingResponse.json().catch(() => null)) as ConnectionsResponse | { error?: string } | null;
      const followersPayload = (await followersResponse.json().catch(() => null)) as ConnectionsResponse | { error?: string } | null;
      if (!followingResponse.ok || !followingPayload || !("items" in followingPayload)) {
        const message = followingPayload && "error" in followingPayload ? followingPayload.error : undefined;
        throw new Error(message || "フォロー中ユーザーを読み込めませんでした。");
      }
      if (!followersResponse.ok || !followersPayload || !("items" in followersPayload)) {
        const message = followersPayload && "error" in followersPayload ? followersPayload.error : undefined;
        throw new Error(message || "フォロワーを読み込めませんでした。");
      }

      setCurrentProfile((profile) => ({
        ...profile,
        following: followingPayload.items.map(mapConnection),
        followers: followersPayload.items.map(mapConnection),
      }));
    } catch (error) {
      setConnectionsError(error instanceof Error ? error.message : "フォロー情報を読み込めませんでした。");
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const ownProfile: Profile = {
    ...currentProfile,
    records: loadingWorkoutRecords ? "..." : String(workoutRecords.length),
    logs: workoutRecords.length > 0 ? workoutRecords.map(formatWorkoutLog).slice(0, 3) : [],
    lastPostedAt: currentProfile.lastPostedAt ?? getLatestPostedAt(workoutRecords),
  };

  const handleSignout = () => {
    window.localStorage.removeItem("group7pj_token");
    document.cookie = "group7pj_token=; path=/; max-age=0; samesite=lax";
    window.location.href = "/login";
  };

  return (
    <AppShell activeView="profile">
      <ProfileScreen
        profile={ownProfile}
        own
        onUpdate={setCurrentProfile}
        onSignout={handleSignout}
        onOpenConnection={(connection) => {
          if (connection.userId) {
            router.push(`/users/${connection.userId}`);
          }
        }}
        onOpenLog={(postId) => router.push(`/posts/${postId}`)}
        recordErrorMessage={[workoutRecordsError, connectionsError].filter(Boolean).join(" / ")}
      />
    </AppShell>
  );
}
