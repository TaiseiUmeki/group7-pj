"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { availableTags } from "../constants/workout";
import styles from "../signup/page.module.css";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [tagIDs, setTagIDs] = useState<number[]>([]);
  const [trainingFrequencyDays, setTrainingFrequencyDays] = useState("3");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const token = window.localStorage.getItem("group7pj_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiUrl}/api/me/profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          bio,
          tagIds: tagIDs,
          trainingFrequencyDays: Number(trainingFrequencyDays),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "プロフィールを保存できませんでした");
      }

      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "プロフィールを保存できませんでした");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.hero}>
          <p className={styles.kicker}>PROFILE</p>
          <h1 className={styles.title}>プロフィール登録</h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>ユーザーネーム</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="表示名を入力"
              required
            />
          </label>

          <label className={styles.field}>
            <span>自己紹介</span>
            <textarea
              name="bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="トレーニング目標や自己紹介を入力"
              rows={4}
            />
          </label>

          <fieldset className={styles.tagSelector}>
            <legend>タグ</legend>
            <div>
              {availableTags.map((tag, index) => {
                const tagID = index + 1;
                const selected = tagIDs.includes(tagID);
                return (
                  <button
                    aria-pressed={selected}
                    className={selected ? styles.selectedTag : ""}
                    key={tag}
                    onClick={() => {
                      setTagIDs((ids) => (
                        ids.includes(tagID)
                          ? ids.filter((id) => id !== tagID)
                          : [...ids, tagID].sort((a, b) => a - b)
                      ));
                    }}
                    type="button"
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className={styles.field}>
            <span>トレーニング頻度</span>
            <div className={styles.daysField}>
              <input
                type="number"
                name="trainingFrequencyDays"
                min="1"
                value={trainingFrequencyDays}
                onChange={(event) => setTrainingFrequencyDays(event.target.value)}
                required
              />
              <span>日間隔</span>
            </div>
          </label>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? "保存中..." : "プロフィールを登録する"}
          </button>
        </form>
      </section>
    </main>
  );
}
