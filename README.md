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

## VSCode タスク
- `dev:up`: `docker compose up -d --build`
- `dev:logs`: `docker compose logs -f --tail=200 frontend backend db`
- `dev:down`: `docker compose down -v`

## API（MVP）
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
