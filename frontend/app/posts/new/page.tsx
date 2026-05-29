"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/AppShell";
import { CreateRecordScreen } from "../../components/screens";
import { exerciseTypeIDs } from "../../constants/workout";
import type { DetailedWorkoutInput, WorkoutRecordResponse } from "../../types/workout";

export default function CreatePostPage() {
  const router = useRouter();
  const [postingDetailedWorkout, setPostingDetailedWorkout] = useState(false);
  const [detailedWorkoutError, setDetailedWorkoutError] = useState("");

  const createDetailedWorkout = async (input: DetailedWorkoutInput) => {
    if (postingDetailedWorkout) {
      return;
    }

    const token = window.localStorage.getItem("group7pj_token");

    if (!token) {
      setDetailedWorkoutError("ログイン情報を確認できません。もう一度ログインしてください。");
      return;
    }

    setPostingDetailedWorkout(true);
    setDetailedWorkoutError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const startTime = new Date(input.startTime);
      const endTime = new Date(startTime.getTime() + input.durationMinutes * 60000);
      const response = await fetch(`${apiUrl}/api/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          didTrain: true,
          trainedOn: startTime.toISOString().slice(0, 10),
          startedAt: startTime.toISOString(),
          endedAt: endTime.toISOString(),
          exerciseType: exerciseTypeIDs[input.bodyPart],
          durationMinutes: input.durationMinutes,
          note: input.note.trim() || `${input.bodyPart} / ${input.exercise}`,
          visibility: "followers_and_recommended",
        }),
      });

      const payload = (await response.json().catch(() => null)) as WorkoutRecordResponse | { error?: string } | null;
      if (!response.ok || !payload || !("id" in payload)) {
        const message = payload && "error" in payload ? payload.error : undefined;
        throw new Error(message || "トレーニング記録を保存できませんでした。");
      }

      router.push("/profile");
    } catch (error) {
      setDetailedWorkoutError(error instanceof Error ? error.message : "トレーニング記録を保存できませんでした。");
    } finally {
      setPostingDetailedWorkout(false);
    }
  };

  return (
    <AppShell activeView="createRecord">
      <CreateRecordScreen
        errorMessage={detailedWorkoutError}
        posting={postingDetailedWorkout}
        onBack={() => router.push("/")}
        onSubmit={createDetailedWorkout}
      />
    </AppShell>
  );
}
