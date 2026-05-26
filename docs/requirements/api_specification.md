# API仕様書

## 1. 共通仕様

### 1.1 ベースURL

- 開発環境: `http://localhost:8080`
- API prefix: `/api`

### 1.2 認証方式

- Cookieベースのセッション認証を想定する。
- 認証が必要なAPIで未ログインの場合は `401 Unauthorized` を返す。
- 自分以外のリソース更新や閲覧権限外の投稿参照は `403 Forbidden` を返す。

### 1.3 共通ヘッダー

| ヘッダー | 必須 | 説明 |
|---|---|---|
| `Content-Type: application/json` | POST/PUT時必須 | JSONリクエストを送信する |
| `Accept: application/json` | 推奨 | JSONレスポンスを受け取る |
| `Cookie` | 認証API以外必須 | セッションCookie |

### 1.4 エラーレスポンス形式

```json
{
  "detail": "エラーメッセージ"
}
```

バリデーションエラーでは、必要に応じて `fields` を返す。

```json
{
  "detail": "入力内容を確認してください",
  "fields": {
    "username": "表示名は必須です"
  }
}
```

### 1.5 ページネーション

一覧取得APIは原則としてカーソルページネーションを利用する。

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `limit` | int | 任意 | 取得件数。デフォルト20、最大50 |
| `cursor` | string | 任意 | 次ページ取得用カーソル |

レスポンス形式:

```json
{
  "items": [],
  "nextCursor": "eyJpZCI6MTAwfQ=="
}
```

### 1.6 ステータスコード一覧

| コード | 意味 | 使用場面 |
|---|---|---|
| 200 | OK | 取得、更新、削除成功 |
| 201 | Created | 作成成功 |
| 204 | No Content | レスポンス本文なしの成功 |
| 400 | Bad Request | 不正なリクエスト |
| 401 | Unauthorized | 未ログイン |
| 403 | Forbidden | 権限なし |
| 404 | Not Found | 対象なし |
| 409 | Conflict | 重複、状態競合 |
| 422 | Unprocessable Entity | バリデーションエラー |
| 500 | Internal Server Error | サーバー内部エラー |

### 1.7 ID管理値

ステータスや種別はDB上では `int` のIDとして管理し、表示値はバックエンドで変換する。

| 種別 | カラム | 例 |
|---|---|---|
| 重視項目 | `profiles.focus_type` | `1=大会勢`, `2=健康維持`, `3=ダイエット` |
| セッション状態 | `training_sessions.status` | `1=進行中`, `2=完了`, `3=キャンセル` |
| 種目・部位 | `training_posts.exercise_type` | `1=胸`, `2=背中`, `3=脚` |
| 推薦枠状態 | `recommendation_slots.status` | `1=有効`, `2=フォロー済み`, `3=期限切れ` |
| 通知種別 | `notifications.notification_type` | `1=いいね`, `2=応援`, `3=サボり検知` |

## 2. 認証API

### POST /api/auth/login

- **説明**: メールアドレスとパスワードでログインする。
- **リクエスト**:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

- **レスポンス**:

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

### POST /api/auth/logout

- **説明**: 現在のセッションからログアウトする。
- **レスポンス**: `204 No Content`

### GET /api/auth/status

- **説明**: 現在のログイン状態を取得する。
- **レスポンス**:

```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

## 3. ユーザー・プロフィールAPI

### POST /api/users

- **説明**: ユーザーを新規登録する。
- **リクエスト**:

```json
{
  "email": "user@example.com",
  "password": "password",
  "username": "トレーニー"
}
```

- **レスポンス**: `201 Created`

```json
{
  "id": 1,
  "email": "user@example.com",
  "profile": {
    "username": "トレーニー"
  }
}
```

### GET /api/me

- **説明**: 自分のユーザー情報とプロフィールを取得する。
- **レスポンス**:

```json
{
  "id": 1,
  "email": "user@example.com",
  "profile": {
    "username": "トレーニー",
    "bio": "週3で筋トレしています",
    "focusType": 1,
    "focusTypeLabel": "大会勢",
    "trainingFrequencyDays": 2
  }
}
```

### PUT /api/me/profile

- **説明**: 自分のプロフィールを更新する。
- **リクエスト**:

```json
{
  "username": "トレーニー",
  "bio": "週3で筋トレしています",
  "focusType": 1,
  "trainingFrequencyDays": 2
}
```

- **レスポンス**:

```json
{
  "username": "トレーニー",
  "bio": "週3で筋トレしています",
  "focusType": 1,
  "focusTypeLabel": "大会勢",
  "trainingFrequencyDays": 2
}
```

### GET /api/users/{userId}

- **説明**: 他ユーザーのプロフィールを取得する。
- **レスポンス**:

```json
{
  "id": 2,
  "profile": {
    "username": "脚トレ好き",
    "bio": "脚の日が好きです",
    "focusType": 2,
    "focusTypeLabel": "健康維持",
    "trainingFrequencyDays": 3
  },
  "isFollowing": false
}
```

## 4. 投稿API

### GET /api/timeline

- **説明**: フォロー先と推薦ユーザーの投稿サマリーを取得する。
- **クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `limit` | int | 任意 | 取得件数 |
| `cursor` | string | 任意 | 次ページカーソル |

- **レスポンス**:

```json
{
  "items": [
    {
      "id": 101,
      "user": {
        "id": 2,
        "username": "脚トレ好き"
      },
      "didTrain": true,
      "trainedOn": "2026-05-26",
      "exerciseType": 3,
      "exerciseTypeLabel": "脚",
      "durationMinutes": 60,
      "notePreview": "スクワット中心にやりました",
      "likeCount": 12,
      "likedByMe": false,
      "createdAt": "2026-05-26T12:00:00+09:00"
    }
  ],
  "nextCursor": null
}
```

### POST /api/posts

- **説明**: 事後報告またはクイックスタート終了後の報告投稿を作成する。
- **リクエスト**:

```json
{
  "sessionId": 10,
  "didTrain": true,
  "trainedOn": "2026-05-26",
  "startedAt": "2026-05-26T10:00:00+09:00",
  "endedAt": "2026-05-26T11:00:00+09:00",
  "exerciseType": 3,
  "durationMinutes": 60,
  "note": "スクワット中心にやりました",
  "visibility": "followers_and_recommended"
}
```

- **レスポンス**: `201 Created`

```json
{
  "id": 101
}
```

### GET /api/posts/{postId}

- **説明**: 投稿詳細を取得する。
- **レスポンス**:

```json
{
  "id": 101,
  "user": {
    "id": 2,
    "username": "脚トレ好き"
  },
  "sessionId": 10,
  "didTrain": true,
  "trainedOn": "2026-05-26",
  "startedAt": "2026-05-26T10:00:00+09:00",
  "endedAt": "2026-05-26T11:00:00+09:00",
  "exerciseType": 3,
  "exerciseTypeLabel": "脚",
  "durationMinutes": 60,
  "note": "スクワット中心にやりました",
  "visibility": "followers_and_recommended",
  "likeCount": 12,
  "likedByMe": false,
  "createdAt": "2026-05-26T12:00:00+09:00"
}
```

### DELETE /api/posts/{postId}

- **説明**: 自分の投稿を論理削除する。
- **レスポンス**: `204 No Content`

### POST /api/posts/{postId}/like

- **説明**: 投稿にいいねする。
- **レスポンス**:

```json
{
  "likedByMe": true,
  "likeCount": 13
}
```

### DELETE /api/posts/{postId}/like

- **説明**: 投稿のいいねを取り消す。
- **レスポンス**:

```json
{
  "likedByMe": false,
  "likeCount": 12
}
```

## 5. クイックスタートAPI

### POST /api/training-sessions

- **説明**: トレーニングセッションを開始する。
- **レスポンス**: `201 Created`

```json
{
  "id": 10,
  "startedAt": "2026-05-26T10:00:00+09:00",
  "status": 1,
  "statusLabel": "進行中"
}
```

### GET /api/training-sessions/active

- **説明**: 進行中セッションを取得する。
- **レスポンス**:

```json
{
  "id": 10,
  "startedAt": "2026-05-26T10:00:00+09:00",
  "status": 1,
  "statusLabel": "進行中"
}
```

進行中セッションがない場合:

```json
{
  "session": null
}
```

### PUT /api/training-sessions/{sessionId}/finish

- **説明**: セッションを終了する。
- **レスポンス**:

```json
{
  "id": 10,
  "startedAt": "2026-05-26T10:00:00+09:00",
  "endedAt": "2026-05-26T11:00:00+09:00",
  "status": 2,
  "statusLabel": "完了"
}
```

### PUT /api/training-sessions/{sessionId}/cancel

- **説明**: セッションをキャンセルする。
- **レスポンス**:

```json
{
  "id": 10,
  "status": 3,
  "statusLabel": "キャンセル"
}
```

## 6. フォロー・推薦API

### POST /api/users/{userId}/follow

- **説明**: 対象ユーザーをフォローする。
- **レスポンス**:

```json
{
  "isFollowing": true
}
```

### DELETE /api/users/{userId}/follow

- **説明**: 対象ユーザーのフォローを解除する。
- **レスポンス**:

```json
{
  "isFollowing": false
}
```

### GET /api/recommendations

- **説明**: 日替わり推薦ユーザーを最大5人取得する。表示中の推薦ユーザーは全員フォロー可能。
- **レスポンス**:

```json
{
  "items": [
    {
      "user": {
        "id": 3,
        "username": "ベンチ好き",
        "focusType": 1,
        "focusTypeLabel": "大会勢"
      },
      "status": 1,
      "statusLabel": "有効",
      "isFollowing": false
    }
  ]
}
```

## 7. ログ・カレンダーAPI

### GET /api/users/{userId}/posts

- **説明**: 対象ユーザーの投稿履歴を新しい順で取得する。
- **クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `limit` | int | 任意 | 取得件数 |
| `cursor` | string | 任意 | 次ページカーソル |

- **レスポンス**: `GET /api/timeline` と同じ投稿サマリー形式。

### GET /api/users/{userId}/calendar

- **説明**: 対象ユーザーの月次トレーニング実績を取得する。
- **クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `year` | int | 必須 | 年 |
| `month` | int | 必須 | 月 |

- **レスポンス**:

```json
{
  "year": 2026,
  "month": 5,
  "days": [
    {
      "date": "2026-05-26",
      "hasPost": true,
      "didTrain": true,
      "postIds": [101]
    }
  ]
}
```

## 8. 応援・通知API

### GET /api/support-targets

- **説明**: 自分がフォローしているユーザーのうち、サボり状態で応援モーダル表示対象となるユーザーを取得する。
- **レスポンス**:

```json
{
  "items": [
    {
      "user": {
        "id": 2,
        "username": "脚トレ好き"
      },
      "lastTrainedOn": "2026-05-20",
      "trainingFrequencyDays": 3,
      "daysWithoutTraining": 6
    }
  ]
}
```

### POST /api/supports

- **説明**: がんばれボタン押下により応援を送信し、対象ユーザーへ通知を作成する。
- **リクエスト**:

```json
{
  "receiverUserId": 2
}
```

- **レスポンス**: `201 Created`

```json
{
  "id": 50,
  "receiverUserId": 2,
  "createdAt": "2026-05-26T12:30:00+09:00"
}
```

### GET /api/notifications

- **説明**: 自分宛ての通知一覧を取得する。
- **クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| `limit` | int | 任意 | 取得件数 |
| `cursor` | string | 任意 | 次ページカーソル |
| `unreadOnly` | boolean | 任意 | 未読のみ取得する |

- **レスポンス**:

```json
{
  "items": [
    {
      "id": 1,
      "notificationType": 2,
      "notificationTypeLabel": "応援",
      "body": "脚トレ好きさんから応援が届きました",
      "trainingPostId": null,
      "supportMessageId": 50,
      "isRead": false,
      "createdAt": "2026-05-26T12:30:00+09:00"
    }
  ],
  "nextCursor": null
}
```

### PUT /api/notifications/{notificationId}/read

- **説明**: 通知を既読にする。
- **レスポンス**:

```json
{
  "id": 1,
  "isRead": true,
  "readAt": "2026-05-26T12:35:00+09:00"
}
```

## 9. バッジAPI

### GET /api/me/badges

- **説明**: 自分の獲得済みバッジを取得する。
- **レスポンス**:

```json
{
  "items": [
    {
      "id": 1,
      "code": "first_post",
      "name": "初投稿",
      "description": "初めてトレーニング報告を投稿した",
      "earnedAt": "2026-05-26T12:00:00+09:00"
    }
  ]
}
```

## 10. マスターAPI

### GET /api/masters/focus-types

- **説明**: 重視項目IDと表示値を取得する。
- **レスポンス**:

```json
{
  "items": [
    { "id": 1, "label": "大会勢" },
    { "id": 2, "label": "健康維持" },
    { "id": 3, "label": "ダイエット" }
  ]
}
```

### GET /api/masters/exercise-types

- **説明**: 種目・部位IDと表示値を取得する。
- **レスポンス**:

```json
{
  "items": [
    { "id": 1, "label": "胸" },
    { "id": 2, "label": "背中" },
    { "id": 3, "label": "脚" }
  ]
}
```

## 11. ダッシュボードAPI

初期MVPでは専用の集計ダッシュボードAPIは提供しない。
継続日数、投稿回数、バッジ判定などの集計が必要になった場合、以下のAPI追加を検討する。

### GET /api/me/stats

- **説明**: 自分の継続状況、投稿回数、直近トレーニング日などを取得する。
