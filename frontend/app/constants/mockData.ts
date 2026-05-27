import type { Profile, TimelinePost } from "../types/workout";

export const myProfile: Profile = {
  name: "山田 太郎",
  handle: "@taro_training",
  bio: "週4日トレーニング中。BIG3を伸ばしながら、楽しく継続する仲間を探しています。",
  tone: "blue",
  records: "128",
  streak: "18日",
  achievements: "24",
  logs: [
    { id: "my-log-2026-05-21-bench-press", date: "5月21日", exercise: "ベンチプレス", detail: "4セット x 8回 / 82.5kg" },
    { id: "my-log-2026-05-20-squat", date: "5月20日", exercise: "スクワット", detail: "5セット x 5回 / 110kg" },
    { id: "my-log-2026-05-18-deadlift", date: "5月18日", exercise: "デッドリフト", detail: "3セット x 5回 / 130kg" },
  ],
  badges: [
    { title: "継続の達人", description: "14日連続で記録", earnedAt: "5月20日獲得", tone: "gold" },
    { title: "ベンチ100", description: "ベンチプレス100kg達成", earnedAt: "4月18日獲得", tone: "blue" },
    { title: "朝活メンバー", description: "朝トレを10回記録", earnedAt: "3月28日獲得", tone: "green" },
  ],
  following: [
    { name: "佐藤 健", handle: "@big3_challenge", tone: "purple", relation: "相互フォロー" },
    { name: "鈴木 美咲", handle: "@morning_runner", tone: "green", relation: "フォロー中" },
    { name: "田中 涼", handle: "@bench_press100", tone: "blue", relation: "相互フォロー" },
  ],
  followers: [
    { name: "佐藤 健", handle: "@big3_challenge", tone: "purple", relation: "フォロー中" },
    { name: "田中 涼", handle: "@bench_press100", tone: "blue", relation: "フォロー中" },
    { name: "伊藤 葵", handle: "@core_training", tone: "green", relation: "フォローする" },
    { name: "高橋 翔", handle: "@run_and_lift", tone: "purple", relation: "フォローする" },
  ],
  inactivityDays: 3,
  tags: ["やる気", "筋肥大", "初心者"],
  lastPostedAt: "2026-05-21T19:00:00+09:00",
};

export const recommendedPosts: TimelinePost[] = [
  {
    id: 1,
    author: {
      name: "ユーザー名",
      handle: "@bench_press100",
      bio: "胸トレが好きです。次はベンチプレス105kgを目指しています。",
      tone: "blue",
      records: "86",
      streak: "12日",
      achievements: "15",
      logs: [
        { id: "recommended-1-log-2026-05-26-bench-press", date: "5月26日", exercise: "ベンチプレス", detail: "1セット x 1回 / 100kg" },
        { id: "recommended-1-log-2026-05-24-incline-press", date: "5月24日", exercise: "インクラインプレス", detail: "4セット x 10回 / 32kg" },
      ],
    },
    didTrain: true,
    exercise: "ベンチプレス",
    duration: "45分",
    summary: "100kgを達成。フォームを維持して最後まで押し切れました。",
    detail: "ウォームアップ後、80kg x 5回、90kg x 3回、100kg x 1回。次回は100kgを安定して挙げられるよう補助種目も継続します。",
    trainedAt: "今日 07:10 - 07:55",
    postedAt: "2時間前",
    likes: 34,
  },
  {
    id: 2,
    author: {
      name: "別のユーザー",
      handle: "@morning_runner",
      bio: "朝ランと脚トレで体力作り。休日は一緒に走れる方を募集中です。",
      tone: "green",
      records: "64",
      streak: "31日",
      achievements: "12",
      logs: [
        { id: "recommended-2-log-2026-05-26-running", date: "5月26日", exercise: "ランニング", detail: "5.0km / 27分12秒" },
        { id: "recommended-2-log-2026-05-25-bulgarian-squat", date: "5月25日", exercise: "ブルガリアンスクワット", detail: "3セット x 12回 / 20kg" },
      ],
    },
    didTrain: true,
    exercise: "ランニング",
    duration: "27分",
    summary: "朝ラン5kmを完走。少しずつペースを戻しています。",
    detail: "5.0kmを27分12秒で完走。前半を抑えて後半にペースアップできました。次は脚トレと組み合わせて継続します。",
    trainedAt: "今日 06:00 - 06:27",
    postedAt: "5時間前",
    likes: 19,
  },
];

export const followingPosts: TimelinePost[] = [
  {
    id: 3,
    author: {
      name: "フォロー中のユーザー",
      handle: "@big3_challenge",
      bio: "BIG3の合計500kgを目指して記録更新中。一緒に追い込みましょう。",
      tone: "purple",
      records: "142",
      streak: "9日",
      achievements: "37",
      logs: [
        { id: "following-3-log-2026-05-26-deadlift", date: "5月26日", exercise: "デッドリフト", detail: "3セット x 3回 / 160kg" },
        { id: "following-3-log-2026-05-22-squat", date: "5月22日", exercise: "スクワット", detail: "5セット x 5回 / 120kg" },
      ],
    },
    didTrain: true,
    exercise: "デッドリフト",
    duration: "60分",
    summary: "BIG3の日。デッドリフトを中心にしっかり追い込みました。",
    detail: "デッドリフト160kgを3セット x 3回。補助種目としてルーマニアンデッドリフトと体幹トレーニングを実施しました。",
    trainedAt: "今日 18:30 - 19:30",
    postedAt: "1時間前",
    likes: 52,
  },
];

