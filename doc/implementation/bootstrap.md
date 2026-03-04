# 初期実装内容（Phase 1）

## 追加した構成
- `backend/`: Go API（標準ライブラリ）
- `frontend/`: React + TypeScript + Vite のひな形
- `docker-compose.yml`: frontend / backend / db のローカル起動構成

## バックエンド（現状）
- `GET /health`
- `GET /companies`
  - `q`（企業名部分一致） / `status`（選考状況）による絞り込み対応
- `POST /companies`
- `GET /companies/:id`
- `PUT /companies/:id`
- `DELETE /companies/:id`

> 注: 現在はMVP開発の初期段階としてインメモリ保存。PostgreSQL連携は次フェーズで実装。

## フロントエンド（現状）
- 企業追加フォーム（企業名、選考状況）
- 企業一覧表示
- 企業名検索と選考状況フィルタ
- APIベースURLは `VITE_API_BASE_URL` で設定
