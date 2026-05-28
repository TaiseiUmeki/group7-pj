"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "../signup/page.module.css";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [focusType, setFocusType] = useState("2");
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
          focusType: Number(focusType),
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

          <label className={styles.field}>
            <span>重視する項目</span>
            <select value={focusType} onChange={(event) => setFocusType(event.target.value)}>
              <option value="1">大会勢</option>
              <option value="2">筋肥大</option>
              <option value="3">健康維持</option>
              <option value="4">初心者</option>
              <option value="5">ボディメイク</option>
              <option value="6">ダイエット</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>トレーニング頻度</span>
            <input
              type="number"
              name="trainingFrequencyDays"
              min="1"
              value={trainingFrequencyDays}
              onChange={(event) => setTrainingFrequencyDays(event.target.value)}
              required
            />
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
