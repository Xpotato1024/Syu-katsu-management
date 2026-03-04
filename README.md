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
   docker compose up --build
   ```
3. アクセス
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8080/health

## API（MVP）
- `GET /companies`
  - `q`: 企業名の部分一致検索（任意）
  - `status`: 選考状況の完全一致フィルタ（任意）
- `POST /companies`
- `GET /companies/:id`
- `PUT /companies/:id`
- `DELETE /companies/:id`

## ドキュメント
- [doc/README.md](./doc/README.md)
