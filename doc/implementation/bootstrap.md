# 初期実装内容（Phase 1）

## 追加した構成
- `backend/`: Go API（標準ライブラリ）
- `frontend/`: React + TypeScript + Vite のひな形
- `docker-compose.yml`: frontend / backend / db のローカル起動構成

## バックエンド（現状）
- `GET /health`
- `GET /companies`
- `POST /companies`
- `GET /companies/:id`
- `PUT /companies/:id`
- `DELETE /companies/:id`

> 注: 現在はMVP開発の初期段階としてインメモリ保存。PostgreSQL連携は次フェーズで実装。

## フロントエンド（現状）
- 企業名の簡易追加フォーム
- 企業一覧表示
- APIベースURLは `VITE_API_BASE_URL` で設定
