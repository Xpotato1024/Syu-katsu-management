# 就活マネジメント（Syu-katsu Management）

就活で利用する企業ごとの選考情報を管理するWebアプリです。  
Go + TypeScript + PostgreSQL を Docker で動かす構成を採用しています。

- 表示名（日本語）: `就活マネジメント`
- 表示名（英語）: `Job Hunt Manager`

## リリース
- 現在のリリースバージョン: `v0.3.11`
- 開発中の表示バージョン（既定値）: `v0.3.12-next`
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
- Frontend で任意のログイン/ログアウト導線を表示できます
  - `VITE_LOGIN_URL`（例: `https://auth.xpotato.net/?rd=https://syu-katsu.xpotato.net`）
  - `VITE_LOGOUT_URL`（例: `https://auth.xpotato.net/logout`）
  - `VITE_APP_VERSION`（フッター表示用バージョン。未設定時は `v0.3.12-next`）
- 注意:
  - `proxy_header` モード時、アプリ内ユーザー登録は利用しません（ユーザー管理は Authelia 側）
  - `local` モードで `AUTH_ALLOW_REGISTRATION=false` の場合、登録フォームは表示されません

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
    - クリックで詳細を展開し、ステップ更新・追加・削除を実施
    - 企業削除に対応
    - ステップごとに `日時` と `備考`（Web面接URL / 会場 / 持ち物メモ）を管理可能
    - ステップごとに `所要時間（分）` を管理可能
    - 企業詳細で以下を管理可能
      - エントリーページURL / エントリーID
      - 志望度
      - 企業研究ドキュメント（Markdown）
      - ESドキュメント（Markdown）
    - ドキュメントは `Edit / View` の切替に対応
    - 企業研究テンプレート挿入時は上書き確認ダイアログを表示
  - `企業別カレンダー`（縦軸: 企業 / 横軸: 日付）
    - 企業名フィルタ対応
    - 現在のスクロール可視範囲外に予定がある企業は左右端を強調表示
    - 本日の日付ヘッダーをハイライト
    - コンパクト表示と企業行の折りたたみに対応
  - `統合予定`（企業横断の日付別予定リスト）
  - `アカウント`（`/me` 表示、再読み込み、任意ログアウトリンク）
  - フッターから `利用規約` をダイアログ表示
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
  - フロントエンドでは「選考状況の複数選択」はクライアント側で絞り込みます
- `POST /companies`
- `GET /companies/:id`
- `PUT /companies/:id`
- `DELETE /companies/:id`
  - 企業の `interestLevel` を保持
- `POST /companies/:id/steps`
  - 企業に選考ステップ（エントリー/ES/Webテスト/GD/面接 など）を追加
  - ステップの `durationMinutes` を保持
- `PUT /companies/:id/steps/:stepId`
  - ステップの `status` / `scheduledAt` / `durationMinutes` / `note` を更新
  - `scheduledAt` は `RFC3339` / `YYYY-MM-DD` / `YYYY-MM-DDTHH:MM`、空文字で日程クリア
- `DELETE /companies/:id/steps/:stepId`
  - 指定ステップを削除

## ドキュメント
- [doc/README.md](./doc/README.md)

## ライセンス
- [MIT License](./LICENSE)

## 免責
- 本アプリは就活情報の自己管理支援を目的としたツールです。
- 記録内容・リンク先情報・選考結果の正確性、完全性、最新性を保証するものではありません。

## DBバックアップ（pg_dump）
- 定期バックアップは `backup` サービスで自動実行されます。
- 出力先は `.env` の `BACKUP_OUTPUT_DIR` で指定します（既定: `./backups`）。
- 実行間隔・保持期間も `.env` で調整できます。
  - `BACKUP_INTERVAL_SECONDS`（既定: `86400`）
  - `BACKUP_RETENTION_DAYS`（既定: `14`）
  - `BACKUP_FILE_PREFIX`（既定: `syukatsu`）

### 単発バックアップ
```bash
docker compose run --rm backup /bin/sh /scripts/backup/backup-once.sh
```

### 復元例
```bash
gunzip -c ./backups/syukatsu_YYYYMMDD_HHMMSS.sql.gz | docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME"
```
