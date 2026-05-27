"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("パスワードが一致しません");
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

      const signupResponse = await fetch(`${apiUrl}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (!signupResponse.ok) {
        const payload = (await signupResponse.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "アカウント作成に失敗しました");
      }

      const loginResponse = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginPayload = (await loginResponse.json().catch(() => null)) as { token?: string; error?: string } | null;

      if (!loginResponse.ok || !loginPayload?.token) {
        router.replace("/login");
        return;
      }

      window.localStorage.setItem("group7pj_token", loginPayload.token);
      document.cookie = `group7pj_token=${encodeURIComponent(loginPayload.token)}; path=/; max-age=86400; samesite=lax`;
      router.replace("/");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "アカウント作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.hero}>
          <p className={styles.kicker}>SIGN UP</p>
          <h1 className={styles.title}>アカウント作成</h1>
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
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="パスワードを入力"
              required
            />
          </label>

          <label className={styles.field}>
            <span>パスワード（確認）</span>
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="パスワードを再入力"
              required
            />
          </label>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

          <button className={styles.submitButton} type="submit" disabled={loading}>
            {loading ? "作成中..." : "アカウントを作成する"}
          </button>
        </form>

        <p className={styles.switchLink}>
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login">ログイン</Link>
        </p>
      </section>
    </main>
  );
}
