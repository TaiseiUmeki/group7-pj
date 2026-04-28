# Backend

GoによるバックエンドAPI

## ディレクトリ構造

```
backend/
├── cmd/server/              # エントリーポイント
├── internal/                # プライベートコード
│   ├── config/              # 設定管理
│   ├── presentation/        # HTTPハンドラー、ミドルウェア、ルーティング
│   ├── application/         # ユースケース
│   ├── domain/              # エンティティ、リポジトリIF
│   ├── infrastructure/      # DBモデル、リポジトリ実装
│   └── di/                  # 依存性注入
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

1. `internal/presentation/http/handler/handler.go`にハンドラーメソッドを追加
2. `internal/presentation/http/router.go`でルーティングを設定

### 新しいビジネスロジックを追加する

1. `internal/domain/`にエンティティとリポジトリIFを追加
2. `internal/application/`にユースケースを追加
3. `internal/infrastructure/`にDBモデルとリポジトリ実装を追加
4. `internal/di/`で依存を組み立てる

## 構成図

```
Request → Presentation → Application → Domain ← Infrastructure
                                     ↑
                                    DI
```
