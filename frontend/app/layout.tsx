import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "筋トレ合トレ",
  description: "最適なトレーニングパートナーを見つけるマッチングアプリ",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // server-side cookie access (await because cookies() may be async proxy)
  let serverTheme: string | null = null;
  try {
    // cookies() can return a Promise-like object in some runtimes
    const cookieStore = await cookies();
    const t = cookieStore.get("theme");
    serverTheme = t && t.value ? (t.value === "dark" ? "dark" : t.value === "light" ? "light" : null) : null;
  } catch {
    // ignore and fall back to client-side script
    serverTheme = null;
  }

  // Inline script to set theme before hydration and avoid FOUC when no server cookie
  const setThemeScript = `try{const t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}else{const prefers=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',prefers?'dark':'light');}}catch(e){};`;

  return (
    <html
      lang="ja"
      className="h-full antialiased"
      suppressHydrationWarning
      {...(serverTheme ? { "data-theme": serverTheme } : {})}
    >
      <head>
        {!serverTheme && <Script id="init-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: setThemeScript }} />}
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
