# 実装ロードマップ（MVPまで）

## Phase 1: プロジェクト土台
- Docker Compose作成（frontend / backend / db）
- Go API雛形作成
- React + TypeScript雛形作成
- `.env.example` 整備

## Phase 2: DB・API
- companiesテーブル作成（マイグレーション導入）
- 企業CRUD API実装
- バリデーション・エラーハンドリング

## Phase 3: UI
- 企業一覧画面
- 企業作成・編集フォーム
- 詳細画面（ES/企業研究メモ表示）
- 検索・ステータスフィルタ

## Phase 4: 仕上げ
- README整備（起動方法、開発手順）
- 最低限のテスト追加
- GitHub ActionsによるCI整備（ドキュメント/将来のGo・Frontendテスト）
- 公開前チェック（機密情報、不要ファイル）
