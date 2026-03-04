# Syu-katsu Management

就活で利用する企業ごとの選考情報を管理するWebアプリです。  
Go + TypeScript + PostgreSQL を Docker で動かす構成を採用しています（現在のバックエンドはMVP開発用にインメモリ実装、DB連携は次フェーズで接続予定）。

## 技術スタック
- Backend: Go + Gin
- Frontend: React + TypeScript + Vite
- Database: PostgreSQL
- Infra(Local): Docker Compose

## セットアップ
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
  - `none`: ローカル開発用の固定ユーザー（`AUTH_DEV_USER_*`）
  - `proxy_header`: リバースプロキシから受け取るユーザー情報ヘッダーを利用
- `proxy_header` の既定ヘッダー
  - `AUTH_PROXY_USER_HEADER=X-Forwarded-User`
  - `AUTH_PROXY_EMAIL_HEADER=X-Forwarded-Email`
- 企業データはユーザーID単位で分離されます（同一プロセス内メモリでもスコープ分離）

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
  - `企業管理`（追加・検索・閲覧・ステップ更新）
  - `選考カレンダー`（縦軸: 企業 / 横軸: 日付）
  - `アカウント`（`/me` 表示、再読み込み、任意ログアウトリンク）
- URLハッシュでも遷移可能
  - `#/companies`
  - `#/timeline`

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
