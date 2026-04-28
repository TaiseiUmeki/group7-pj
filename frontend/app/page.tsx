"use client";

import { useEffect, useMemo, useState } from "react";

type ApiUser = {
  id: number;
  name: string;
  email: string;
};

type Screen = "home" | "search" | "messages" | "profile";

type Partner = {
  id: number;
  name: string;
  initial: string;
  level: string;
  area: string;
  part: string;
  bench: string;
  goal: string;
  time: string;
};

type MessageThread = {
  id: number;
  name: string;
  initial: string;
  message: string;
  time: string;
  unread?: number;
};

const samplePartners: Partner[] = [
  {
    id: 1,
    name: "Taro",
    initial: "T",
    level: "中級者",
    area: "渋谷",
    part: "胸",
    bench: "100kg",
    goal: "ダイエット",
    time: "今夜20:00",
  },
  {
    id: 2,
    name: "Yuki",
    initial: "Y",
    level: "初心者",
    area: "渋谷",
    part: "胸",
    bench: "50kg",
    goal: "健康維持",
    time: "今夜20:30",
  },
  {
    id: 3,
    name: "Ken",
    initial: "K",
    level: "上級者",
    area: "六本木",
    part: "脚",
    bench: "130kg",
    goal: "大会勢",
    time: "明日18:00",
  },
];

const sampleMessages: MessageThread[] = [
  {
    id: 1,
    name: "Taro",
    initial: "T",
    message: "タオルと飲み物あれば大丈夫です。装備はお任せします。",
    time: "14:30",
  },
  {
    id: 2,
    name: "Yuki",
    initial: "Y",
    message: "もちろんです！場所はどこにしましょう？",
    time: "10:20",
    unread: 1,
  },
  {
    id: 3,
    name: "Ken",
    initial: "K",
    message: "高重量に興味があります。一緒にやりませんか？",
    time: "09:00",
    unread: 2,
  },
];

const profileRecords = [
  ["ベンチプレス", "100kg"],
  ["スクワット", "150kg"],
  ["デッドリフト", "180kg"],
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [apiState, setApiState] = useState<"loading" | "live" | "sample">(
    "loading",
  );

  useEffect(() => {
    let active = true;

    const fetchUsers = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const response = await fetch(`${apiUrl}/api/users`);

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data = (await response.json()) as ApiUser[] | null;
        if (!active) return;

        setUsers(data ?? []);
        setApiState("live");
      } catch {
        if (!active) return;
        setApiState("sample");
      }
    };

    fetchUsers();

    return () => {
      active = false;
    };
  }, []);

  const partners = useMemo(() => {
    if (users.length === 0) return samplePartners;

    return samplePartners.map((partner, index) => {
      const apiUser = users[index];
      if (!apiUser) return partner;

      return {
        ...partner,
        id: apiUser.id,
        name: apiUser.name || partner.name,
        initial: (apiUser.name || partner.name).slice(0, 1).toUpperCase(),
      };
    });
  }, [users]);

  return (
    <main className="app-shell">
      <div className="phone-frame">
        {screen === "home" && (
          <HomeScreen
            apiState={apiState}
            partners={partners}
            onNavigate={setScreen}
          />
        )}
        {screen === "search" && (
          <SearchScreen partners={partners} onBack={() => setScreen("home")} />
        )}
        {screen === "messages" && (
          <MessagesScreen onBack={() => setScreen("home")} />
        )}
        {screen === "profile" && (
          <ProfileScreen onBack={() => setScreen("home")} />
        )}
        <BottomNav active={screen} onNavigate={setScreen} />
      </div>
    </main>
  );
}

function HomeScreen({
  apiState,
  partners,
  onNavigate,
}: {
  apiState: "loading" | "live" | "sample";
  partners: Partner[];
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <>
      <Header
        title="💪 筋トレ合トレ"
        subtitle="最適なパートナーを見つける"
      />
      <section className="screen-content home-content">
        <div className="hero-panel">
          <h1>トレーニングパートナーを探そう</h1>
          <p>一人じゃない。一緒にトレーニングしよう。</p>
        </div>

        <div className="feature-grid">
          <button className="feature-card blue" onClick={() => onNavigate("search")}>
            <span>🔍</span>
            パートナー検索
          </button>
          <button className="feature-card purple" onClick={() => onNavigate("profile")}>
            <span>👤</span>
            プロフィール
          </button>
          <button className="feature-card green" onClick={() => onNavigate("messages")}>
            <span>💬</span>
            メッセージ
          </button>
          <button className="feature-card orange" type="button">
            <span>🗺️</span>
            ジムマップ
          </button>
        </div>

        <div className="section-heading">
          <h2>最近のマッチング</h2>
          <span>
            {apiState === "live"
              ? "API接続中"
              : apiState === "loading"
                ? "確認中"
                : "サンプル表示"}
          </span>
        </div>

        <div className="match-list">
          {partners.map((partner) => (
            <CompactMatchCard key={partner.id} partner={partner} />
          ))}
        </div>
      </section>
    </>
  );
}

function SearchScreen({
  partners,
  onBack,
}: {
  partners: Partner[];
  onBack: () => void;
}) {
  return (
    <>
      <TopBar title="パートナー検索" onBack={onBack} />
      <section className="screen-content search-content">
        <SearchField label="⏰ 時間帯" value="20:00" accessory="◴" />
        <SearchField label="📍 エリア" value="渋谷" accessory="⌄" />
        <SearchField label="💪 トレーニング部位" value="胸" accessory="⌄" />
        <SearchField label="🎯 レベル" value="全て" accessory="⌄" />

        <button className="primary-action" type="button">
          🔍 検索
        </button>

        <p className="result-count">{partners.length} 件のパートナーが見つかりました</p>

        <div className="partner-list">
          {partners.slice(0, 2).map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      </section>
    </>
  );
}

function MessagesScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <TopBar title="メッセージ" onBack={onBack} />
      <section className="message-list">
        {sampleMessages.map((thread) => (
          <button className="message-row" key={thread.id} type="button">
            <Avatar initial={thread.initial} />
            <div className="message-copy">
              <strong>{thread.name}</strong>
              <p>{thread.message}</p>
            </div>
            <div className="message-meta">
              <span>{thread.time}</span>
              {thread.unread && <b>{thread.unread}</b>}
            </div>
          </button>
        ))}
      </section>
    </>
  );
}

function ProfileScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <TopBar title="プロフィール" onBack={onBack} action="編集" />
      <section className="screen-content profile-content">
        <div className="profile-hero">
          <div className="profile-avatar">太</div>
          <h1>太郎</h1>
          <p>28歳・男</p>
        </div>

        <InfoPanel label="📍 活動エリア" value="渋谷" />
        <InfoPanel label="🏋️ 筋トレ歴" value="3年" />
        <InfoPanel label="🎯 目指すカテゴリ" value="ダイエット" />
        <InfoPanel
          label="📝 自己紹介"
          value="筋トレ3年目。同じくらいのレベルの人と一緒にトレーニングしたい！"
          multiline
        />

        <h2 className="records-title">📊 各種記録</h2>
        <div className="records-list">
          {profileRecords.map(([label, value]) => (
            <div className="record-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="home-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

function TopBar({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack: () => void;
  action?: string;
}) {
  return (
    <header className="top-bar">
      <button aria-label="戻る" onClick={onBack} type="button">
        ←
      </button>
      <h1>{title}</h1>
      <button className="top-action" type="button">
        {action}
      </button>
    </header>
  );
}

function BottomNav({
  active,
  onNavigate,
}: {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const items: { screen: Screen; icon: string; label: string }[] = [
    { screen: "home", icon: "🏠", label: "ホーム" },
    { screen: "search", icon: "🔍", label: "検索" },
    { screen: "messages", icon: "💬", label: "メッセージ" },
    { screen: "profile", icon: "👤", label: "プロフィール" },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          className={active === item.screen ? "active" : ""}
          key={item.screen}
          onClick={() => onNavigate(item.screen)}
          type="button"
        >
          {item.screen === "messages" && <span className="nav-badge">3</span>}
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Avatar({ initial }: { initial: string }) {
  return <div className="avatar">{initial}</div>;
}

function CompactMatchCard({ partner }: { partner: Partner }) {
  return (
    <article className="compact-card">
      <Avatar initial={partner.initial} />
      <div>
        <h3>{partner.name}</h3>
        <p>{partner.level}</p>
        <span>
          📍 {partner.area}・⏰ {partner.time}
        </span>
      </div>
      <button aria-label={`${partner.name}にいいね`} type="button">
        ❤️
      </button>
    </article>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <article className="partner-card">
      <div className="partner-head">
        <Avatar initial={partner.initial} />
        <div>
          <h3>{partner.name}</h3>
          <p>{partner.level}</p>
        </div>
        <button aria-label={`${partner.name}にいいね`} type="button">
          ❤️
        </button>
      </div>
      <div className="partner-detail">
        <p>📍 {partner.area}</p>
        <p>🏋️ ベンチプレス: {partner.bench}</p>
        <p>🎯 目標: {partner.goal}</p>
        <p>⏰ トレ時間: {partner.time}</p>
      </div>
      <div className="partner-actions">
        <button type="button">申し込む</button>
        <button type="button">詳細</button>
      </div>
    </article>
  );
}

function SearchField({
  label,
  value,
  accessory,
}: {
  label: string;
  value: string;
  accessory: string;
}) {
  return (
    <label className="search-field">
      <span>{label}</span>
      <button type="button">
        {value}
        <b>{accessory}</b>
      </button>
    </label>
  );
}

function InfoPanel({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <article className={multiline ? "info-panel multiline" : "info-panel"}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
