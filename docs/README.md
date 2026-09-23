# docs/ — 設計ドキュメント目次

本プロジェクトの設計・企画ドキュメントをカテゴリ別に管理しています。
新規参加者は本ディレクトリからプロジェクト全体を理解できます。

## 文書一覧

| カテゴリ | ファイル | 役割 | 更新時期 |
|----------|----------|------|----------|
| 企画 | [proposal/proposal.md](proposal/proposal.md) | 技術企画書（PoC の目的・範囲・技術選定） | 要件変更時 |
| 企画 | [proposal/business-proposal.md](proposal/business-proposal.md) | 経営層向け企画書（ビジネス価値・投資対効果） | 経営層への報告時 |
| 企画 | [proposal/epicure-license.md](proposal/epicure-license.md) | Epicure データのライセンス調査メモ（CC BY 4.0） | ライセンス条件変更時 |
| アーキテクチャ | [architecture/technical-architecture.md](architecture/technical-architecture.md) | 技術アーキテクチャ（構成図・app/ 内部構成・データモデル） | 設計変更時 |
| アーキテクチャ | [architecture/data-flow-graph.md](architecture/data-flow-graph.md) | データフロー図（Epicure→味スコア→レシピ生成のデータの流れ） | データフロー変更時 |
| API | [api/api-spec-details.md](api/api-spec-details.md) | API 仕様詳細（エンドポイント・リクエスト/レスポンス形式） | API 追加・変更時 |
| UX | [ux/page-transition-chart.md](ux/page-transition-chart.md) | ページ遷移図（画面間の遷移ルール） | 画面追加・変更時 |
| UX | [ux/ui-design.md](ux/ui-design.md) | UI 設計（レイアウト・コンポーネント構成） | UI 変更時 |

## 補足

- ルートの [README.md](../README.md) がプロジェクト全体の入口です。
- 各文書は使用駆動開発（UC-01〜UC-12）の実装進捗に合わせて更新してください。
