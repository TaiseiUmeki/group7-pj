import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "筋トレ合トレ",
  description: "最適なトレーニングパートナーを見つけるマッチングアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
