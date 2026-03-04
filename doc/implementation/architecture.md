# 実装構成案

## 技術スタック
- **Backend**: Go (Gin もしくは Echo)
- **Frontend**: TypeScript (React + Vite)
- **Database**: PostgreSQL
- **Container**: Docker / Docker Compose

## 構成イメージ
- `frontend` コンテナ
  - Reactアプリ
  - API経由で企業情報を操作
- `backend` コンテナ
  - REST API提供
  - 入力バリデーション、DBアクセス
- `db` コンテナ
  - PostgreSQL
  - 企業・選考データを永続化

## ドメインモデル（初期）

### companies
- id (UUID)
- name
- mypage_link
- mypage_id
- selection_flow
- selection_status
- es_content
- research_content
- created_at
- updated_at

## APIの方向性（MVP）
- `GET /companies` 企業一覧取得
- `POST /companies` 企業作成
- `GET /companies/:id` 企業詳細取得
- `PUT /companies/:id` 企業更新
- `DELETE /companies/:id` 企業削除

## セキュリティ・公開方針（初期）
- シークレットは環境変数で注入し、Git管理しない
- CORS設定を明示
- SQLインジェクション対策としてORM/プレースホルダを利用
