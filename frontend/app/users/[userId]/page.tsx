"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { ProfileScreen } from "../../components/screens";
import styles from "../../page.module.css";
import type { Profile } from "../../types/workout";
import { mapApiProfileToProfile, type UserProfileApiResponse } from "../../utils/apiMappers";

export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [detailError, setDetailError] = useState("");

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
        setProfile(mapApiProfileToProfile(payload.profile));
      } catch (error) {
        setProfile(null);
        setDetailError(error instanceof Error ? error.message : "プロフィールを読み込めませんでした。");
      }
    };

    void loadMemberProfile();
  }, [params.userId]);

  return (
    <AppShell activeView="member">
      {profile ? (
        <ProfileScreen profile={profile} onBack={() => router.push("/")} />
      ) : (
        <p className={styles.emptyState}>{detailError || "プロフィールを読み込んでいます..."}</p>
      )}
    </AppShell>
  );
}
