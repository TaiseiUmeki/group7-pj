"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../components/AppShell";
import { QuickStartScreen } from "../components/screens";
import type { WorkoutSession } from "../types/workout";
import { getWorkoutElapsed } from "../utils/workout";

export default function QuickStartPage() {
  const router = useRouter();
  const [workoutSession, setWorkoutSession] = useState<WorkoutSession | null>(null);
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
    if (!workoutSession) {
      return;
    }

    const elapsedMs = getWorkoutElapsed(workoutSession);
    const durationMinutes = Math.max(1, Math.ceil(elapsedMs / 60000));
    setWorkoutSession({
      ...workoutSession,
      activeSince: null,
      elapsedBeforePause: elapsedMs,
    });

    setWorkoutError("");
    const query = new URLSearchParams({
      startTime: new Date(workoutSession.startedAt).toISOString(),
      durationMinutes: String(durationMinutes),
    });
    setWorkoutSession(null);
    router.push(`/posts/new?${query.toString()}`);
  };

  return (
    <AppShell activeView="quickStart">
      {workoutSession ? (
        <QuickStartScreen
          session={workoutSession}
          errorMessage={workoutError}
          posting={false}
          onTogglePause={toggleWorkoutPause}
          onFinish={finishWorkout}
        />
      ) : null}
    </AppShell>
  );
}
