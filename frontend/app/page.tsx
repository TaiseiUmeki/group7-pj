"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "./components/AppShell";
import { TimelineScreen } from "./components/screens";
import type { Profile, TimelinePost, TimelineTab } from "./types/workout";
import {
  mapRecommendationItemToProfile,
  mapTimelineItemToPost,
  type RecommendationsApiResponse,
  type TimelineApiResponse,
} from "./utils/apiMappers";

type PostLikeResponse = {
  likedByMe: boolean;
  likeCount: number;
};

export default function Home() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const [activeTab, setActiveTab] = useState<TimelineTab>("following");
  const [likedPostIDs, setLikedPostIDs] = useState<Array<TimelinePost["id"]>>([]);
  const [timelinePosts, setTimelinePosts] = useState<Record<TimelineTab, TimelinePost[]>>({
    following: [],
    recommended: [],
  });
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [timelineError, setTimelineError] = useState("");
  const [recommendedUsers, setRecommendedUsers] = useState<Profile[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [followingRecommendationIDs, setFollowingRecommendationIDs] = useState<number[]>([]);

  const loadTimeline = useCallback(async (source: TimelineTab) => {
    const token = window.localStorage.getItem("group7pj_token");

    if (!token) {
      setTimelinePosts((posts) => ({ ...posts, [source]: [] }));
      setTimelineError("");
      return;
    }

    setLoadingTimeline(true);
    setTimelineError("");

    try {
      const response = await fetch(`${apiUrl}/api/timeline?source=${source}&limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as TimelineApiResponse | { error?: string } | null;
      if (!response.ok || !payload || !("items" in payload)) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "タイムラインを読み込めませんでした。");
      }

      setTimelinePosts((posts) => ({
        ...posts,
        [source]: payload.items.map(mapTimelineItemToPost),
      }));
      setLikedPostIDs((ids) => {
        const next = new Set(ids);
        for (const item of payload.items) {
          if (item.likedByMe) {
            next.add(item.id);
          }
        }
        return Array.from(next);
      });
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : "タイムラインを読み込めませんでした。");
    } finally {
      setLoadingTimeline(false);
    }
  }, [apiUrl]);

  const loadRecommendations = useCallback(async () => {
    const token = window.localStorage.getItem("group7pj_token");

    if (!token) {
      setRecommendedUsers([]);
      setRecommendationsError("");
      return;
    }

    setLoadingRecommendations(true);
    setRecommendationsError("");

    try {
      const response = await fetch(`${apiUrl}/api/recommendations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as RecommendationsApiResponse | { error?: string } | null;
      if (!response.ok || !payload || !("items" in payload)) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "おすすめユーザーを読み込めませんでした。");
      }

      setRecommendedUsers(payload.items.slice(0, 5).map(mapRecommendationItemToProfile));
    } catch (error) {
      setRecommendationsError(error instanceof Error ? error.message : "おすすめユーザーを読み込めませんでした。");
    } finally {
      setLoadingRecommendations(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadTimeline(activeTab);
    if (activeTab === "recommended") {
      void loadRecommendations();
    }
  }, [activeTab, loadRecommendations, loadTimeline]);

  const openMemberProfile = (profile: Profile) => {
    if (profile.userId) {
      router.push(`/users/${profile.userId}`);
    }
  };

  const toggleLike = async (postID: TimelinePost["id"]) => {
    const token = window.localStorage.getItem("group7pj_token");
    if (!token) {
      setTimelineError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    const liked = likedPostIDs.includes(postID);
    const response = await fetch(`${apiUrl}/api/posts/${postID}/like`, {
      method: liked ? "DELETE" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json().catch(() => null)) as PostLikeResponse | { error?: string } | null;
    if (!response.ok || !payload || !("likedByMe" in payload)) {
      const message = payload && "error" in payload ? payload.error : undefined;
      setTimelineError(message || "いいねを更新できませんでした。");
      return;
    }

    setTimelineError("");
    setLikedPostIDs((ids) => (
      payload.likedByMe
        ? Array.from(new Set([...ids, postID]))
        : ids.filter((id) => id !== postID)
    ));
    setTimelinePosts((posts) => {
      const updatePosts = (items: TimelinePost[]) => items.map((post) => (
        post.id === postID
          ? { ...post, likes: payload.likedByMe ? Math.max(0, payload.likeCount - 1) : payload.likeCount }
          : post
      ));

      return {
        following: updatePosts(posts.following),
        recommended: updatePosts(posts.recommended),
      };
    });
  };

  const followRecommendation = async (profile: Profile) => {
    const token = window.localStorage.getItem("group7pj_token");
    if (!token || !profile.userId) {
      setRecommendationsError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    setFollowingRecommendationIDs((ids) => Array.from(new Set([...ids, profile.userId as number])));

    try {
      const following = Boolean(profile.isFollowing);
      const response = await fetch(`${apiUrl}/api/users/${profile.userId}/follow`, {
        method: following ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as { following?: boolean; error?: string } | null;
      if (!response.ok || !payload || !("following" in payload)) {
        throw new Error(payload?.error || "フォローできませんでした。");
      }

      setRecommendationsError("");
      setRecommendedUsers((users) => users.map((user) => (
        user.userId === profile.userId ? { ...user, isFollowing: payload.following } : user
      )));
      void loadTimeline("recommended");
    } catch (error) {
      setRecommendationsError(error instanceof Error ? error.message : "フォローできませんでした。");
    } finally {
      setFollowingRecommendationIDs((ids) => ids.filter((id) => id !== profile.userId));
    }
  };

  return (
    <AppShell activeView="timeline">
      <TimelineScreen
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProfile={openMemberProfile}
        onOpenDetail={(post) => router.push(`/posts/${post.id}`)}
        onToggleLike={toggleLike}
        likedPostIDs={likedPostIDs}
        timelinePosts={timelinePosts[activeTab]}
        loadingTimeline={loadingTimeline}
        timelineError={timelineError}
        recommendedUsers={recommendedUsers}
        loadingRecommendations={loadingRecommendations}
        recommendationsError={recommendationsError}
        followingRecommendationIDs={followingRecommendationIDs}
        onFollowRecommendation={followRecommendation}
        onCreateRecord={() => router.push("/posts/new")}
      />
    </AppShell>
  );
}
