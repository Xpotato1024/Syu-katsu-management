# Syu-katsu Management

就活で利用する企業ごとの選考情報を管理するWebアプリです。  
Go + TypeScript + PostgreSQL を Docker で動かす構成を採用しています。

## リリース
- 現在のリリースバージョン: `v0.3.0`
- コンテナイメージ公開:
  - Workflow: `.github/workflows/release-images.yml`
  - backend: `ghcr.io/xpotato1024/syu-katsu-management-backend:<tag>`
  - frontend: `ghcr.io/xpotato1024/syu-katsu-management-frontend:<tag>`

## 技術スタック
- Backend: Go (net/http)
- Frontend: React + TypeScript + Vite
- Database: PostgreSQL
- Infra(Local): Docker Compose

## 将来の技術方針
- 現状のバックエンドは標準 `net/http` を採用しています。
- ただし将来的に以下の要件が強くなった場合は、Gin への移行を検討します。
  - APIルーティングとミドルウェア構成の複雑化
  - バリデーション・エラーハンドリング・可観測性の統一が必要な段階
  - 開発効率や運用性の観点でフレームワーク導入メリットが明確になった段階

## セットアップ
`git clone` 後、`.env` を編集して `docker compose up -d --build` するだけで導入可能です。

1. 環境変数をコピー
   ```bash
   cp .env.example .env
   ```
2. コンテナ起動
   ```bash
   docker compose up -d --build
   ```
3. アクセス
   - Frontend: http://localhost:15173
   - Backend(直接確認): http://localhost:18080/health

## 永続化ストレージ
- 既定は PostgreSQL 永続化です（`STORAGE_BACKEND=postgres`）
- 起動時にバックエンドが必要テーブルを自動作成します（`DB_AUTO_MIGRATE=true`）
- 一時的にインメモリで動かす場合のみ `STORAGE_BACKEND=memory` を指定してください

## 開発運用（FileBrowser共存）
- FileBrowserの `8080` と競合しないよう、開発時は以下ポートを既定で利用
  - Frontend: `15173`
  - Backend: `18080`
  - DB: `15432`
- すべて `.env` で変更可能
  - `FRONTEND_HOST_PORT`
  - `BACKEND_HOST_PORT`
  - `DB_HOST_PORT`
- Frontendは `VITE_API_BASE_URL=/api` を利用し、Vite proxyで backend へ中継
  - 開発: `VITE_DEV_PROXY_TARGET=http://backend:8080`
  - 本番(nginx): `/api` を backend にリバースプロキシ

## 認証（Authelia OIDC想定）
- バックエンドは `AUTH_MODE` で動作モードを切り替え
  - `local`: 独自ID/パスワード認証（`/auth/register`, `/auth/login`）
  - `none`: ローカル開発用の固定ユーザー（`AUTH_DEV_USER_*`）
  - `proxy_header`: リバースプロキシから受け取るユーザー情報ヘッダーを利用
- `proxy_header` の既定ヘッダー
  - `AUTH_PROXY_USER_HEADER=X-Forwarded-User`
  - `AUTH_PROXY_EMAIL_HEADER=X-Forwarded-Email`
- 企業データはユーザーID単位で分離されます（同一プロセス内メモリでもスコープ分離）
- `local` モードではセッションCookieを利用します
  - `AUTH_SESSION_SECRET`
  - `AUTH_SESSION_COOKIE_NAME`
  - `AUTH_SESSION_TTL_HOURS`
  - `AUTH_COOKIE_SECURE`
  - `AUTH_ALLOW_REGISTRATION`

## 本番導入チェックリスト
1. `.env` で `AUTH_MODE=proxy_header` を設定
2. `AUTH_PROXY_USER_HEADER` / `AUTH_PROXY_EMAIL_HEADER` をプロキシ設定と一致させる
3. `DB_PASSWORD` を強固な値に変更
4. `CORS_ALLOWED_ORIGINS` を本番ドメインのみに制限
5. nginx で `/api` を backend にリバースプロキシ
6. DBボリュームのバックアップ戦略を用意

## VSCode タスク
- `dev:up`: `docker compose up -d --build`
- `dev:logs`: `docker compose logs -f --tail=200 frontend backend db`
- `dev:down`: `docker compose down -v`

## GUIテスト用スクリプト
- WSL/bash から実行
  - 起動: `./scripts/gui-up.sh`
  - 停止: `./scripts/gui-down.sh`
  - 停止（DBボリュームも削除）: `./scripts/gui-down.sh -v`
- PowerShell から実行
  - 起動: `./scripts/gui-up.ps1`
  - 停止: `./scripts/gui-down.ps1`
  - 停止（DBボリュームも削除）: `./scripts/gui-down.ps1 -v`

## Devアカウント向けテストデータ投入
- 起動後に実行（既定120件）
  - WSL/bash: `./scripts/seed-dev-data.sh`
  - PowerShell: `./scripts/seed-dev-data.ps1`
- 件数指定
  - WSL/bash: `./scripts/seed-dev-data.sh 300`
  - PowerShell: `./scripts/seed-dev-data.ps1 -Count 300`
- 補足
  - `AUTH_MODE=none` では `AUTH_DEV_USER_ID` に紐づくデータとして投入されます
  - `AUTH_MODE=proxy_header` でも `AUTH_PROXY_USER_HEADER` に `AUTH_DEV_USER_ID` を付与して投入します
  - 企業名のプレフィックスは `.env` の `DEV_SEED_PREFIX` で変更できます（既定: `Dev検証企業`）

## 画面構成
- ハンバーガーメニューで画面遷移・機能操作を集約
  - `企業管理`
    - 初期表示は「企業名 + 横向きフロー」のみ
    - クリックで詳細を展開し、ステップ更新・追加を実施
    - 企業詳細で以下を管理可能
      - エントリーページURL / エントリーID
      - 企業研究ドキュメント（Markdown）
      - ESドキュメント（Markdown）
    - ドキュメントは `Edit / View` の切替に対応
    - 企業研究テンプレート挿入時は上書き確認ダイアログを表示
  - `企業別カレンダー`（縦軸: 企業 / 横軸: 日付）
    - 企業名フィルタ対応
    - 現在のスクロール可視範囲外に予定がある企業は左右端を強調表示
  - `統合予定`（企業横断の日付別予定リスト）
  - `アカウント`（`/me` 表示、再読み込み、任意ログアウトリンク）
- URLハッシュでも遷移可能
  - `#/companies`
  - `#/timeline`
  - `#/agenda`

## API（MVP）
- `GET /me`
  - 現在のログインユーザー情報を返却（未認証時は `401`）
- `GET /companies`
  - `q`: 企業名の部分一致検索（任意）
  - `status`: 選考状況の完全一致フィルタ（任意）
- `POST /companies`
- `GET /companies/:id`
- `PUT /companies/:id`
- `DELETE /companies/:id`
- `POST /companies/:id/steps`
  - 企業に選考ステップ（エントリー/ES/Webテスト/GD/面接 など）を追加
- `PUT /companies/:id/steps/:stepId`
  - ステップの `status` と `scheduledAt` を更新
  - `scheduledAt` は `RFC3339` または `YYYY-MM-DD`、空文字で日程クリア

## ドキュメント
- [doc/README.md](./doc/README.md)

## ライセンス
- [MIT License](./LICENSE)

## 免責
- 本アプリは就活情報の自己管理支援を目的としたツールです。
- 記録内容・リンク先情報・選考結果の正確性、完全性、最新性を保証するものではありません。
