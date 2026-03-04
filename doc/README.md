# Syu-katsu Management ドキュメント索引

このディレクトリは、就活で使う企業ごとの状態管理アプリの設計・実装・課題を管理するためのドキュメント置き場です。

## 1. 要件定義
- [requirements/overview.md](./requirements/overview.md)
  - プロダクトの目的、対象ユーザー、管理対象データ、機能要件・非機能要件

## 2. 実装計画
- [implementation/architecture.md](./implementation/architecture.md)
  - Docker / Go / TypeScript / DB を用いたシステム構成案
- [implementation/roadmap.md](./implementation/roadmap.md)
  - 初期セットアップからMVPまでの実装ステップ

## 3. 課題・検討事項
- [issues/open-questions.md](./issues/open-questions.md)
  - 現時点の未確定事項、技術選定・運用面の論点

## 更新ルール
- 機能追加や仕様変更時は、実装前に `requirements` と `implementation` の該当ファイルを更新する。
- 実装中に判明した課題は `issues/open-questions.md` に記録し、対応方針が決まり次第更新する。
