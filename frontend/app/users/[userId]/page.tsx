"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { ProfileScreen } from "../../components/screens";
import styles from "../../page.module.css";
import type { Profile, WorkoutRecord } from "../../types/workout";
import { mapApiProfileToProfile, type UserProfileApiResponse } from "../../utils/apiMappers";
import { formatWorkoutLog, getLatestPostedAt } from "../../utils/workout";

type FollowResponse = {
  following: boolean;
};

async function fetchVisibleWorkoutRecords(apiUrl: string, token: string, userID: number) {
  const recordsResponse = await fetch(`${apiUrl}/api/users/${userID}/workout-records`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const recordsPayload = (await recordsResponse.json().catch(() => null)) as WorkoutRecord[] | { error?: string } | null;
  if (!recordsResponse.ok || !Array.isArray(recordsPayload)) {
    const message = recordsPayload && !Array.isArray(recordsPayload) && "error" in recordsPayload ? recordsPayload.error : undefined;
    throw new Error(message || "トレーニング記録を読み込めませんでした。");
  }
  return recordsPayload;
}

export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [detailError, setDetailError] = useState("");
  const [workoutRecordsError, setWorkoutRecordsError] = useState("");
  const [followUpdating, setFollowUpdating] = useState(false);

  useEffect(() => {
    const userID = Number(params.userId);
    const token = window.localStorage.getItem("group7pj_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

    if (!Number.isFinite(userID)) {
      setDetailError("ユーザーIDが正しくありません。");
      return;
    }
    if (!token) {
      setDetailError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    const loadMemberProfile = async () => {
      setDetailError("");
      setWorkoutRecordsError("");
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
        const nextProfile = mapApiProfileToProfile(payload.profile);
        try {
          const recordsPayload = await fetchVisibleWorkoutRecords(apiUrl, token, userID);
          setProfile({
            ...nextProfile,
            records: String(recordsPayload.length),
            logs: recordsPayload.map(formatWorkoutLog).slice(0, 3),
            lastPostedAt: getLatestPostedAt(recordsPayload) ?? nextProfile.lastPostedAt,
          });
        } catch (error) {
          setWorkoutRecordsError(error instanceof Error ? error.message : "トレーニング記録を読み込めませんでした。");
          setProfile(nextProfile);
        }
      } catch (error) {
        setProfile(null);
        setDetailError(error instanceof Error ? error.message : "プロフィールを読み込めませんでした。");
      }
    };

    void loadMemberProfile();
  }, [params.userId]);

  const toggleFollow = async () => {
    const userID = Number(params.userId);
    const token = window.localStorage.getItem("group7pj_token");
    if (!Number.isFinite(userID)) {
      setDetailError("ユーザーIDが正しくありません。");
      return;
    }
    if (!token) {
      setDetailError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    setFollowUpdating(true);
    setDetailError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiUrl}/api/users/${userID}/follow`, {
        method: profile?.isFollowing ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as FollowResponse | { error?: string } | null;
      if (!response.ok || !payload || !("following" in payload)) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "フォロー状態を更新できませんでした。");
      }
      setProfile((currentProfile) => (
        currentProfile ? { ...currentProfile, isFollowing: payload.following } : currentProfile
      ));
      try {
        const recordsPayload = await fetchVisibleWorkoutRecords(apiUrl, token, userID);
        setWorkoutRecordsError("");
        setProfile((currentProfile) => (
          currentProfile ? {
            ...currentProfile,
            records: String(recordsPayload.length),
            logs: recordsPayload.map(formatWorkoutLog).slice(0, 3),
            lastPostedAt: getLatestPostedAt(recordsPayload) ?? currentProfile.lastPostedAt,
          } : currentProfile
        ));
      } catch (error) {
        setWorkoutRecordsError(error instanceof Error ? error.message : "トレーニング記録を読み込めませんでした。");
      }
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "フォロー状態を更新できませんでした。");
    } finally {
      setFollowUpdating(false);
    }
  };

  return (
    <AppShell activeView="member">
      {profile ? (
        <ProfileScreen
          profile={profile}
          followUpdating={followUpdating}
          onBack={() => router.push("/")}
          onFollowToggle={toggleFollow}
          onOpenLog={(postID) => router.push(`/posts/${postID}`)}
          recordErrorMessage={workoutRecordsError}
        />
      ) : (
        <p className={styles.emptyState}>{detailError || "プロフィールを読み込んでいます..."}</p>
      )}
    </AppShell>
  );
}
