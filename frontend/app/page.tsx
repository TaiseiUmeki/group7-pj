"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface User {
  id: number;
  name: string;
  email: string;
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const response = await fetch(`${apiUrl}/api/users`, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: User[] | null = await response.json();
        setUsers(data || []);

        // ブラウザのコンソールにレスポンスを吐き出す
        console.log("=== ユーザー情報 (Health Check) ===");
        console.log("Status:", response.status);
        console.log("Users:", data);
        console.log("====================================");
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error fetching users:", errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black min-h-screen">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          style={{ width: "auto", height: "auto" }}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Health Check Dashboard
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            バックエンドのMySQLデータベースからユーザー情報を取得しています。
            <br />
            ブラウザのコンソール (F12) を開いてレスポンスを確認できます。
          </p>

          {/* ステータス表示 */}
          <div className="w-full mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {loading && (
              <p className="text-center text-zinc-600 dark:text-zinc-400">
                読み込み中...
              </p>
            )}
            {error && (
              <p className="text-center text-red-600 dark:text-red-400">
                エラー: {error}
              </p>
            )}
            {!loading && !error && (
              <div>
                <p className="text-center text-green-600 dark:text-green-400 font-semibold">
                  ✓ 接続成功
                </p>
                <p className="text-center text-zinc-600 dark:text-zinc-400 mt-2">
                  取得したユーザー数: {users.length}
                </p>
              </div>
            )}
          </div>

          {/* ユーザー一覧 */}
          {!loading && users.length > 0 && (
            <div className="w-full mt-8">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-zinc-50">
                ユーザー一覧
              </h2>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                  >
                    <p className="text-sm">
                      <span className="font-semibold">ID:</span> {user.id}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Name:</span> {user.name}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Email:</span> {user.email}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row mt-8">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://nextjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
              style={{ width: "auto", height: "auto" }}
            />
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}

