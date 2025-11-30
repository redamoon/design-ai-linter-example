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

**注意**: Voltaを使用している場合、pnpmのshimスクリプトで`ERR_INVALID_THIS`エラーが発生する可能性があります。これはVoltaのshimスクリプトとpnpmの間の既知の互換性問題です。

### 推奨解決策

1. **npmを使用する（最も簡単・確実）**: 
   ```bash
   npm install
   ```
   `package-lock.json`は自動的に`.gitignore`で除外されます。

2. **pnpmを直接インストール**（Voltaのshimをバイパス）:
   ```bash
   # pnpmを直接インストール（Volta経由ではない）
   curl -fsSL https://get.pnpm.io/install.sh | sh -
   # シェルを再起動するか、以下を実行
   export PNPM_HOME="$HOME/.local/share/pnpm"
   export PATH="$PNPM_HOME:$PATH"
   pnpm install
   ```

3. **環境変数でshimを無効化**（動作しない場合あり）:
   ```bash
   VOLTA_SKIP_PNPM_SHIM=1 pnpm install
   ```

### 根本原因

Voltaのshimスクリプトとpnpmの間で、URLSearchParamsの扱いに関する互換性の問題があります。Volta 2.0.2でも解決されていないため、pnpmを直接インストールするか、npmを使用することを推奨します。

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

- `GEMINI_API_KEY`: Gemini APIキー（必須）

## 参考

- [design-ai-linter ドキュメント](https://github.com/redamoon/design-tools/tree/main/packages/design-ai-linter)

## ライセンス

MIT

