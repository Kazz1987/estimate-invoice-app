# DB設計書

## ER図（概要）

```
customers ─────┬──── estimates ──── estimate_items ─── items
               │         │                    │
               │         │                    └── item_categories
               │         │
               └──── invoices ──── invoice_items
                         │
                    (estimate_id で1対1)

company_settings（単独・自社情報）
```

## テーブル一覧

| テーブル名 | 説明 |
|-----------|------|
| `customers` | 顧客（取引先） |
| `item_categories` | 品目マスタ：大項目 |
| `items` | 品目マスタ：小項目（大項目に紐づく） |
| `estimates` | 見積書ヘッダ |
| `estimate_items` | 見積明細 |
| `invoices` | 請求書ヘッダ |
| `invoice_items` | 請求明細 |
| `company_settings` | 自社情報（PDF・印鑑欄用） |

## ステータス管理

見積書（`estimates.status`）で業務フローを管理する。

| ステータス | 意味 | 遷移タイミング（想定） |
|-----------|------|----------------------|
| 見積 | 見積書作成直後 | 見積書を新規作成したとき |
| 注文 | 受注確定 | ユーザーが手動で更新 |
| 納品 | 納品完了 | ユーザーが手動で更新 |
| 請求 | 請求済み | 請求書を作成したとき（自動更新） |

請求書作成時は `invoices` レコードを追加し、元の見積書ステータスを「請求」に更新する。

## 品目マスタの階層構造

```
item_categories（大項目）
  └── items（小項目 + 単価 + 単位）
```

- 大項目：例）「Web制作」「保守運用」
- 小項目：例）「トップページ制作」単価 50,000円

見積・請求の明細には、マスタの名称・単価を**スナップショット**として保存する。  
マスタを後から変更しても、過去の見積・請求の内容は変わらない。

## 見積 → 請求の引き継ぎ

1. 見積書と見積明細を作成
2. 請求書作成時、`estimate_items` の内容を `invoice_items` にコピー
3. `invoices.estimate_id` で元見積と紐づけ（1見積 : 1請求）
4. 見積書ステータスを「請求」に更新

## 金額計算

| 項目 | 計算式 |
|------|--------|
| 明細金額 | `quantity × unit_price` |
| 小計 | 明細金額の合計 |
| 消費税額 | `subtotal × tax_rate / 100`（端数処理はアプリ側で定義） |
| 合計 | `subtotal + tax_amount` |

金額は日本円整数（`DECIMAL(12,0)`）で保存。

## 削除方針

| テーブル | 方針 |
|---------|------|
| `customers`, `item_categories`, `items` | 論理削除（`is_deleted`） |
| `estimate_items`, `invoice_items` | 親削除時に CASCADE で物理削除 |
| `estimates`, `invoices` | 物理削除はアプリ側で制御（請求済みは削除不可など） |
