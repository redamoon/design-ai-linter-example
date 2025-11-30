# design-ai-linter-example

design-ai-linterを使用したデザインチェックのサンプルリポジトリです。

このリポジトリでは、Figmaからエクスポートされたデザイントークンをリントし、コード内の生の値を検出してデザイントークンへの置き換えを提案する実装例を提供します。

## 機能

- デザイントークンのリント（静的ルール + AIルール）
- コードファイル内の生の値検出
- カスタムAIルールの実装例
- GitHub ActionsによるCI/CD統合

## セットアップ

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定（AI機能を使用する場合）

`.env`ファイルを作成し、以下のいずれかを設定します：

```bash
OPENAI_API_KEY=sk-...
# または
GEMINI_API_KEY=AIza...
```

`.env.example`を参考にしてください。

### 3. 設定ファイルの確認

`designlintrc.json`でルール設定を確認・カスタマイズできます。

## 使用方法

### 基本的なリント

```bash
# ステージングされたファイルのみをチェック（デフォルト）
pnpm lint

# 全ファイルをチェック
pnpm lint:all

# 修正を試みる
pnpm fix
```

### カスタムルールの実行

このリポジトリには、カスタムAIルールの実装例が含まれています：

- `prompts/custom-rule.md`: カスタムプロンプトの例
- `schemas/custom-rule.ts`: Zodスキーマの例

`designlintrc.json`でカスタムルールが有効になっています。

## サンプルファイル

### トークンファイル

- `tokens.json`: デザイントークンの定義（カラー、スペーシング、タイポグラフィなど）

### コードファイル

- `src/components/Button.tsx`: 生のカラー値やピクセル値が含まれるReactコンポーネント（リントで検出される）
- `src/styles/global.css`: 生の値が含まれるCSSファイル
- `src/utils/theme.ts`: トークンを使用した正しい実装例

## CI/CD

GitHub Actionsが設定されており、プッシュやプルリクエスト時に自動的にリントが実行されます。

### CIでの環境変数設定

GitHubリポジトリのSettings > Secrets and variables > Actionsで、以下のシークレットを設定してください：

- `OPENAI_API_KEY`: OpenAI APIキー（OpenAIを使用する場合）
- `GEMINI_API_KEY`: Gemini APIキー（Geminiを使用する場合）

## 参考

- [design-ai-linter ドキュメント](https://github.com/redamoon/design-tools/tree/main/packages/design-ai-linter)

## ライセンス

MIT

