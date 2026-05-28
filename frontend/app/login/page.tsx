"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type") || "";
      let payload: { token?: string; error?: string } | null = null;

      if (contentType.includes("application/json")) {
        payload = (await response.json()) as { token?: string; error?: string };
      } else {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `HTTP ${response.status}`);
        }
      }

      if (!response.ok || !payload?.token) {
        throw new Error(payload?.error || "ログインに失敗しました");
      }

      window.localStorage.setItem("group7pj_token", payload.token);
      document.cookie = `group7pj_token=${encodeURIComponent(payload.token)}; path=/; max-age=86400; samesite=lax`;
      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.hero}>
          <p className={styles.kicker}>LOGIN</p>
          <h1 className={styles.title}>ログイン</h1>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>メールアドレス</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@email.com"
              required
            />
          </label>

          <label className={styles.field}>
            <span>パスワード</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="パスワードを入力"
              required
            />
          </label>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? "ログイン中..." : "ログインする"}
          </button>
        </form>

        <p className={styles.switchLink}>
          アカウントをお持ちでない方は{" "}
          <Link href="/signup">アカウント作成</Link>
        </p>
      </section>
    </main>
  );
}
