"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { ProfileScreen } from "../components/screens";
import { availableTags } from "../constants/workout";
import { myProfile } from "../constants/mockData";
import type { Profile, WorkoutRecord } from "../types/workout";
import { formatWorkoutLog, getLatestPostedAt } from "../utils/workout";

export default function ProfilePage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const [currentProfile, setCurrentProfile] = useState<Profile>(myProfile);
  const [workoutRecords, setWorkoutRecords] = useState<WorkoutRecord[]>([]);
  const [loadingWorkoutRecords, setLoadingWorkoutRecords] = useState(false);
  const [workoutRecordsError, setWorkoutRecordsError] = useState("");

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

  return (
    <AppShell activeView="profile">
      <ProfileScreen
        profile={ownProfile}
        own
        onUpdate={setCurrentProfile}
        onSignout={handleSignout}
        recordErrorMessage={workoutRecordsError}
      />
    </AppShell>
  );
}
