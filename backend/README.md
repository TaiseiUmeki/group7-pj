# Backend

GoによるバックエンドAPI

## ディレクトリ構造

```
backend/
├── cmd/server/              # エントリーポイント
├── internal/                # プライベートコード
│   ├── api/                 # APIレイヤー（ハンドラー、ミドルウェア、ルーティング）
│   ├── config/              # 設定管理
│   ├── service/             # ビジネスロジック
│   ├── repository/          # データベースアクセス層
│   └── model/               # データモデル定義
├── pkg/                     # 外部から使用可能な共有ライブラリ
├── migrations/              # DBマイグレーションスクリプト
├── tests/                   # テスト
├── go.mod
├── .env
└── README.md
```

## セットアップ

### 前提条件

- Go 1.20+

### インストール

```bash
cd backend
go mod download
```

### 実行

```bash
go run cmd/server/main.go
```

環境変数で設定可能：

- `PORT`: サーバーポート（デフォルト: 8080）
- `ENV`: 環境（development/production）
- `DB_DRIVER`: データベースドライバ
- `DB_URL`: データベースURL

### テスト

```bash
go test ./tests/...
```

## API エンドポイント

- `GET /health`: ヘルスチェック

## 開発

### 新しいハンドラーを追加する

1. `internal/api/handler/handler.go`にハンドラーメソッドを追加
2. `internal/api/router.go`でルーティングを設定

### 新しいビジネスロジックを追加する

1. `internal/service/service.go`にメソッドを追加
2. 必要に応じて`internal/repository/`のメソッドを追加

## 構成図

```
Request → Middleware → Router → Handler → Service → Repository → DB
         ↓                                  ↓
       Logging                      Business Logic
```
