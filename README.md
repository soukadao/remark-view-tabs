# @soukadao/remark-view-tabs

## ライブラリ名

`@soukadao/remark-view-tabs`

## プラグインの概要

画面仕様書やデザイン Markdown 向けに、表示切り替え用 tabs と要素属性を読み取る remark プラグインです。

`::tabs` ブロックを Markdown から取り除いて root の `data.design.tabs` に集約し、見出し、画像、テーブルに付いた `{key=value}` 形式の属性を `data.design.attrs` に付与します。

## プラグインでの記法

tabs の基本形です。

```md
::tabs device select
- pc: PC
- tablet: タブレット
- mobile: スマホ
::
```

表示形式を省略すると `tabs` として扱われます。

```md
::tabs state
- normal: 通常
- empty: データなし
- error: エラー
::
```

`::tabs <name> <display>` の形式で指定します。`display` は `tabs` または `select` です。

見出しの末尾に属性を付けられます。

```md
## 画面イメージ {type=layout}
```

画像の直後に属性を付けられます。

```md
![PC通常](./images/user-list-pc-normal.png){device=pc state=normal}
```

テーブルの直後に属性だけの行を置くと、そのテーブルに属性が付きます。

```md
| ID | 項目名 | 種別 |
|---|---|---|
| keyword | キーワード | text |
{type=controls}
```

属性は `{key=value}` または `{flag}` の形式で、キーには英数字、ハイフン、アンダースコアを使えます。
