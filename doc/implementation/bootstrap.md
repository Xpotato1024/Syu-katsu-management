# 初期実装内容（Phase 1）

## 追加した構成
- `backend/`: Go API（標準ライブラリ）
- `frontend/`: React + TypeScript + Vite のひな形
- `docker-compose.yml`: frontend / backend / db のローカル起動構成
- `.vscode/tasks.json`: Docker Compose の起動/停止/ログ確認タスク

## バックエンド（現状）
- `GET /health`
- `GET /me`（認証ユーザー情報）
- `GET /companies`
  - `q`（企業名部分一致） / `status`（選考状況）による絞り込み対応
- `POST /companies`
- `GET /companies/:id`
- `PUT /companies/:id`
- `DELETE /companies/:id`
- `POST /companies/:id/steps`（選考ステップ追加）
- `PUT /companies/:id/steps/:stepId`（ステップ状態・日程更新）
- 選考状況を整理
  - 企業: `未着手 / 選考中 / 内定 / お見送り / 辞退`
  - ステップ: `未着手 / 予定 / 実施済 / 通過 / 不通過 / 辞退`
- 認証モード
  - `AUTH_MODE=none`: 開発用固定ユーザー
  - `AUTH_MODE=proxy_header`: リバースプロキシヘッダー（Authelia OIDC連携前提）
- 企業データはユーザーID単位で分離

> 注: 現在はMVP開発の初期段階としてインメモリ保存。ユーザー分離はメモリ内で実装済み、PostgreSQL連携は次フェーズで実装。

## フロントエンド（現状）
- ハンバーガーメニューによる画面遷移・機能集約
  - 企業管理画面（追加・検索・閲覧・ステップ更新）
  - 選考カレンダー画面（縦:企業 / 横:日付）
  - アカウント情報（`/me` 表示、再読み込み）
- 企業追加フォーム（企業名、選考状況、初期選考ステップ）
- 企業名検索と選考状況フィルタ
- 企業ごとに選考ステップを後から追加
- 各選考ステップの状態・日程を後から更新
- APIベースURLは `VITE_API_BASE_URL`（既定 `/api`）で設定
- 開発時はVite proxyで `/api` を `backend:8080` へ中継

## 開発用ポート（既定）
- Frontend: `15173`
- Backend: `18080`
- DB: `15432`
