"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { QuickStartScreen } from "../components/screens";
import type { WorkoutRecordResponse, WorkoutSession } from "../types/workout";
import { getWorkoutElapsed } from "../utils/workout";

export default function QuickStartPage() {
  const router = useRouter();
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
  const [postingWorkout, setPostingWorkout] = useState(false);
  const [workoutError, setWorkoutError] = useState("");

  useEffect(() => {
    setWorkoutSession((session) => session ?? {
      startedAt: Date.now(),
      activeSince: Date.now(),
      elapsedBeforePause: 0,
    });
  }, []);

  const toggleWorkoutPause = () => {
    setWorkoutSession((session) => {
      if (!session) {
        return null;
      }

      if (session.activeSince === null) {
        return { ...session, activeSince: Date.now() };
      }

      return {
        ...session,
        activeSince: null,
        elapsedBeforePause: getWorkoutElapsed(session),
      };
    });
  };

  const finishWorkout = async () => {
    if (!workoutSession || postingWorkout) {
      return;
    }

    const elapsedMs = getWorkoutElapsed(workoutSession);
    const durationMinutes = Math.max(1, Math.ceil(elapsedMs / 60000));
    setWorkoutSession({
      ...workoutSession,
      activeSince: null,
      elapsedBeforePause: elapsedMs,
    });

    const token = window.localStorage.getItem("group7pj_token");

    if (!token) {
      setWorkoutError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    setPostingWorkout(true);
    setWorkoutError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiUrl}/api/workout-records`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          record_type: "quick",
          start_time: new Date(workoutSession.startedAt).toISOString(),
          duration_minutes: durationMinutes,
        }),
      });

      const payload = (await response.json().catch(() => null)) as WorkoutRecordResponse | { error?: string } | null;
      if (!response.ok || !payload || !("id" in payload)) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "トレーニング記録を保存できませんでした。");
      }

      setWorkoutSession(null);
      router.push("/profile");
    } catch (error) {
      setWorkoutError(error instanceof Error ? error.message : "トレーニング記録を保存できませんでした。");
    } finally {
      setPostingWorkout(false);
    }
  };

  return (
    <AppShell activeView="quickStart">
      {workoutSession ? (
        <QuickStartScreen
          session={workoutSession}
          errorMessage={workoutError}
          posting={postingWorkout}
          onTogglePause={toggleWorkoutPause}
          onFinish={finishWorkout}
        />
      ) : null}
    </AppShell>
  );
}
