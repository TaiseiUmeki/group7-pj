"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "./components/AppShell";
import { TimelineScreen } from "./components/screens";
import type { Profile, TimelinePost, TimelineTab } from "./types/workout";
import { mapTimelineItemToPost, type TimelineApiResponse } from "./utils/apiMappers";

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

  useEffect(() => {
    void loadTimeline(activeTab);
  }, [activeTab, loadTimeline]);

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
        onCreateRecord={() => router.push("/posts/new")}
      />
    </AppShell>
  );
}
