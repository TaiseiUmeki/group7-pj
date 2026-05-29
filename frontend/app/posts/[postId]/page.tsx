"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { PostDetailScreen } from "../../components/screens";
import styles from "../../page.module.css";
import type { Profile, TimelinePost } from "../../types/workout";
import { mapTimelineItemToPost, type TimelineApiItem } from "../../utils/apiMappers";

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const [post, setPost] = useState<TimelinePost | null>(null);
  const [likedPostIDs, setLikedPostIDs] = useState<Array<TimelinePost["id"]>>([]);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    const postID = Number(params.postId);
    const token = window.localStorage.getItem("group7pj_token");
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

    if (!Number.isFinite(postID)) {
      setDetailError("投稿IDが正しくありません。");
      return;
    }
    if (!token) {
      setDetailError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    const loadPostDetail = async () => {
      setDetailError("");
      try {
        const response = await fetch(`${apiUrl}/api/posts/${postID}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = (await response.json().catch(() => null)) as TimelineApiItem | { error?: string } | null;
        if (!response.ok || !payload || !("id" in payload)) {
          const message = payload && "error" in payload ? payload.error : undefined;
          throw new Error(message || "投稿詳細を読み込めませんでした。");
        }
        setPost(mapTimelineItemToPost(payload));
        setLikedPostIDs((ids) => (payload.likedByMe && !ids.includes(payload.id) ? [...ids, payload.id] : ids));
      } catch (error) {
        setPost(null);
        setDetailError(error instanceof Error ? error.message : "投稿詳細を読み込めませんでした。");
      }
    };

    void loadPostDetail();
  }, [params.postId]);

  const openMemberProfile = (profile: Profile) => {
    if (profile.userId) {
      router.push(`/users/${profile.userId}`);
    }
  };

  const toggleLike = (postID: TimelinePost["id"]) => {
    setLikedPostIDs((ids) => (
      ids.includes(postID) ? ids.filter((id) => id !== postID) : [...ids, postID]
    ));
  };

  return (
    <AppShell activeView="postDetail">
      {post ? (
        <PostDetailScreen
          post={post}
          liked={likedPostIDs.includes(post.id)}
          onBack={() => router.push("/")}
          onOpenProfile={openMemberProfile}
          onToggleLike={() => toggleLike(post.id)}
        />
      ) : (
        <p className={styles.emptyState}>{detailError || "投稿詳細を読み込んでいます..."}</p>
      )}
    </AppShell>
  );
}
