# Design Markdown remark plugin 仕様書

## 目的

Design Markdown は、通常の Markdown をベースに、設計書プレビューに必要な最小限の意味情報を付与するための Markdown プロファイルである。

AI は Design Markdown 形式の `.md` ファイルを生成・更新し、人間は Web ベースのプレビューアで確認する。プレビューアは PC、タブレット、スマホなどの表示切替や、状態別の画面イメージ、項目定義テーブルを扱える。

本仕様の実装単位は `remark` plugin とする。

## 基本方針

- ファイル形式は `.md` とする。
- 既存 Markdown で表現できるものは独自構文にしない。
- 独自構文はタブ定義のみを第一候補とする。
- 画像、テーブル、リンク、見出し、本文は通常の Markdown を使う。
- Markdown 要素への意味付けは属性 `{key=value}` で行う。
- プラグインは Markdown を直接 HTML 化する責務を持たず、mdast に設計書向けメタデータを付与する。
- 表示制御やUI描画は viewer 側の責務とする。

## 対象ユースケース

- 画面設計書
- 帳票設計書
- API設計書
- バッチ設計書
- テーブル定義書
- 業務フロー設計書
- テスト仕様書

第一版では画面設計書を主対象とし、他の設計書にも転用できる構造にする。

## Markdownで表現する要素

| 要素 | 表現 |
|---|---|
| 文書メタ情報 | YAML frontmatter |
| 章・節 | `#`, `##`, `###` |
| 画像 | `![alt](path)` |
| 表 | Markdown table |
| 参照 | Markdown link |
| 補足 | blockquote または通常本文 |
| コード | fenced code block |
| 箇条書き | Markdown list |

## 拡張する要素

### tabs

タブ切替の候補を定義する。

```md
::tabs device
- pc: PC
- tablet: タブレット
- mobile: スマホ
::
```

```md
::tabs state
- normal: 通常
- empty: データなし
- error: エラー
::
```

`tabs` は `remark-directive` の `containerDirective` として解釈する。

### attributes

Markdown 要素に意味情報を付与する。

```md
![PC版ユーザー一覧](./images/user-list-pc.png){device=pc state=normal}
```

```md
## 項目定義 {type=controls}
```

```md
| ID | 項目名 | 種別 |
|---|---|---|
| keyword | キーワード | text |
{type=controls}
```

属性構文は Pandoc / markdown-it-attrs 風の `{key=value}` を採用する。

## 属性仕様

### 共通属性

| 属性 | 用途 | 例 |
|---|---|---|
| `id` | 要素ID | `{id=main-image}` |
| `type` | セクションや表の種類 | `{type=controls}` |
| `device` | デバイス別表示 | `{device=pc}` |
| `state` | 状態別表示 | `{state=empty}` |
| `role` | 要素の役割 | `{role=primary}` |
| `hidden` | 初期非表示 | `{hidden}` |

### device

`device` は画面サイズや表示対象デバイスを表す。

推奨値:

- `pc`
- `tablet`
- `mobile`

ただし、プロジェクトごとに `desktop`, `sp` などを定義してもよい。定義済み値は `::tabs device` から取得する。

### state

`state` は同じ画面や仕様の状態差分を表す。

推奨値:

- `normal`
- `loading`
- `empty`
- `error`
- `disabled`
- `readonly`
- `editing`
- `confirm`
- `success`

`state` は独自ブロックにしない。`::tabs state` と属性 `{state=...}` の組み合わせで表現する。

### type

`type` はセクションやテーブルの意味を表す。

推奨値:

- `overview`
- `layout`
- `controls`
- `events`
- `messages`
- `api`
- `data`
- `rules`
- `history`
- `checklist`

## サンプル

```md
---
schema: design-md/v1
kind: screen
id: SCR-USER-001
title: ユーザー一覧画面
version: 1.0
status: draft
---

# ユーザー一覧画面

ユーザーを検索し、詳細画面へ遷移するための画面。

## 画面イメージ {type=layout}

::tabs device
- pc: PC
- tablet: タブレット
- mobile: スマホ
::

::tabs state
- normal: 通常
- empty: データなし
- error: エラー
::

![PC通常](./images/user-list-pc-normal.png){device=pc state=normal}
![PCデータなし](./images/user-list-pc-empty.png){device=pc state=empty}
![スマホ通常](./images/user-list-mobile-normal.png){device=mobile state=normal}
![スマホエラー](./images/user-list-mobile-error.png){device=mobile state=error}

## 項目定義 {type=controls}

| ID | 項目名 | 種別 | 必須 | 説明 |
|---|---|---|---|---|
| keyword | キーワード | text | no | 氏名またはメールアドレスで検索する |
| status | ステータス | select | no | ユーザー状態で絞り込む |
| search | 検索 | button | no | 検索処理を実行する |

## イベント定義 {type=events}

| ID | 契機 | 処理 |
|---|---|---|
| search | search.click | 検索APIを呼び出し、一覧を更新する |
| open_detail | users.detail.click | ユーザー詳細画面へ遷移する |
```

## プラグイン責務

`remark-design-md` は以下を行う。

1. `::tabs <name> ... ::` を解析する。
2. Markdown 要素末尾の `{key=value}` 属性を解析する。
3. tabs 定義を収集する。
4. 属性を mdast node の `data.design.attrs` に正規化して付与する。
5. tabs 定義を root node の `data.design.tabs` に付与する。
6. 定義されていない `device` や `state` の利用を検出する。
7. バリデーション結果を `vfile.message()` に出力する。

## 非責務

以下は remark plugin の責務にしない。

- Web UI のタブ描画
- 画像の実ファイル存在確認
- Excel、PDF、docx への変換
- AI API の呼び出し
- Markdown エディタの実装
- ドラッグ操作などのGUI編集

## 推奨パッケージ構成

```text
packages/remark-design-md/
  src/
    index.ts
    parse-attrs.ts
    parse-tabs.ts
    validate.ts
    types.ts
  tests/
    fixtures/
      screen.md
      invalid-unknown-device.md
      invalid-duplicate-tab.md
    parse.test.ts
    validate.test.ts
  README.md
```

## 依存候補

```text
unified
remark-parse
remark-stringify
remark-gfm
remark-frontmatter
remark-directive
unist-util-visit
vfile
```

実装時は `remark-directive` で独自ディレクティブを mdast に取り込み、`unist-util-visit` で対象ノードを走査する。これは remark plugin 実装で一般的な構成である。

参考:

- https://maymoku.com/blog/how-to-make-remark-plugin/
- https://github.com/remarkjs/remark-directive
- https://unifiedjs.com/

## TypeScript型

```ts
export type DesignAttrs = Record<string, string | boolean>;

export type DesignTab = {
  key: string;
  label: string;
};

export type DesignTabGroup = {
  name: string;
  tabs: DesignTab[];
};

export type DesignData = {
  attrs?: DesignAttrs;
  tabs?: DesignTabGroup[];
};

export type RemarkDesignMdOptions = {
  validate?: boolean;
  knownTabNames?: string[];
  requiredFrontmatter?: string[];
};
```

mdast node には以下のように付与する。

```ts
node.data = {
  ...node.data,
  design: {
    attrs: {
      device: "pc",
      state: "normal"
    }
  }
};
```

root node には以下のように付与する。

```ts
tree.data = {
  ...tree.data,
  design: {
    tabs: [
      {
        name: "device",
        tabs: [
          { key: "pc", label: "PC" },
          { key: "tablet", label: "タブレット" },
          { key: "mobile", label: "スマホ" }
        ]
      }
    ]
  }
};
```

## 処理フロー

```text
Markdown
  ↓ remark-parse
mdast
  ↓ remark-gfm
table対応済みmdast
  ↓ remark-directive
tabs directive対応済みmdast
  ↓ remark-design-md
設計書メタデータ付きmdast
  ↓ viewer
Webプレビュー
```

## tabs解析仕様

入力:

```md
::tabs device
- pc: PC
- tablet: タブレット
- mobile: スマホ
::
```

出力:

```ts
{
  name: "device",
  tabs: [
    { key: "pc", label: "PC" },
    { key: "tablet", label: "タブレット" },
    { key: "mobile", label: "スマホ" }
  ]
}
```

制約:

- `tabs` の直後にタブグループ名を必須とする。
- タブ項目は `- key: label` 形式を必須とする。
- 同一グループ内の `key` 重複はエラーとする。
- 同一ファイル内の同名 `tabs` グループ重複はエラーまたは警告とする。第一版ではエラーとする。

### tabs の mdast 解析

`remark-directive` 適用後、tabs 定義は以下の条件を満たす `containerDirective` として扱う。

- `node.type` が `containerDirective` である。
- `node.name` が `tabs` である。
- `node.children` の先頭が `list` である。
- `listItem` は単一の `paragraph` を持つ。
- `paragraph` は単一の `text` を持ち、その値を最初の `:` で `key` と `label` に分割できる。

`key` と `label` は前後の空白を trim する。`key` または `label` が空文字の場合はエラーとする。`label` 内の `:` は許可し、最初の `:` より後ろをすべて label として扱う。

tabs 定義用の `containerDirective` は root の `data.design.tabs` に収集したあと、viewer に渡す本文 mdast から取り除く。

### 未定義タブ値の扱い

`device` または `state` 属性が存在する場合、対応する `::tabs device` または `::tabs state` は必須とする。対応する tabs グループが存在しない場合も、値がグループ内に存在しない場合もエラーとする。

`knownTabNames` が指定されている場合、`knownTabNames` に含まれない tabs グループ名は警告とする。未指定の場合は任意の tabs グループ名を許可する。

## 属性解析仕様

対象:

- heading
- image
- paragraph
- table
- list
- blockquote
- code

第一版では、少なくとも heading、image、table に対応する。

形式:

```md
{key=value key2=value2 flag}
```

解釈:

```ts
{
  key: "value",
  key2: "value2",
  flag: true
}
```

制約:

- 属性は対象要素の末尾に置く。
- `key` は英数字、ハイフン、アンダースコアを許可する。
- `value` は空白を含まない値を第一版の対象とする。
- 空白を含む値が必要な場合は、将来 `"quoted value"` を追加検討する。

## バリデーション仕様

### エラー

- `::tabs` にグループ名がない。
- 同一 `tabs` グループ内に同じ key がある。
- 同一ファイル内に同じ `tabs` グループが複数ある。
- `{device=...}` があるが `::tabs device` に定義されていない。
- `{state=...}` があるが `::tabs state` に定義されていない。

### 警告

- `type` が推奨値に含まれない。
- image に alt がない。
- heading に空の属性がある。
- table に属性があるが viewer が解釈できない `type` である。

## viewer連携

viewer は mdast の `data.design` を見て表示を制御する。

想定UI:

- 文書ヘッダー
- セクション一覧
- 本文プレビュー
- タブグループごとの切替UI
- 選択中タブに一致する要素のみ表示
- バリデーションパネル

複数タブグループがある場合は、全条件一致で表示する。

例:

```md
![PC通常](./pc-normal.png){device=pc state=normal}
```

現在選択が `device=pc` かつ `state=normal` のとき表示する。

## AI生成ルール

AIに Design Markdown を生成させる場合は、以下を指示する。

- 通常の Markdown を優先する。
- タブ切替が必要な場合だけ `::tabs` を使う。
- 画像には `device` や `state` 属性を付ける。
- 項目定義やイベント定義は Markdown table で書く。
- 未定義の独自構文を作らない。
- HTMLを直接書かない。
- 同じ `id` やタブキーを重複させない。
- 既存Markdownを更新する場合、関係ない部分を変更しない。

## MVP範囲

第一版で実装する。

- `::tabs <name>` の解析
- heading / image / table の属性解析
- root への tabs metadata 付与
- node への attrs metadata 付与
- `device` / `state` の整合性チェック
- fixture ベースの単体テスト

第一版では実装しない。

- GUI編集からMarkdownへ戻す serializer
- 画像ファイルの存在確認
- 複雑な属性値のクォート対応
- HTML出力の直接カスタマイズ
- Excel出力

## 将来拡張

- serializer による mdast から Markdown への安定出力
- table schema の検証
- frontmatter schema の検証
- 文書間リンクの依存関係グラフ
- 画像ファイル存在確認
- Playwright による viewer 表示テスト
- design-md/v2 での属性値クォート対応
- LSP によるエディタ補完
