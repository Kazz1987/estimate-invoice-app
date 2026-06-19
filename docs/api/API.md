# API仕様書

## 概要

- **ベースURL**: ローカル開発時 `http://localhost:3001`、本番は環境変数`VITE_API_BASE_URL`で指定するRender上のURL
- **データ形式**: リクエスト・レスポンスともにJSON（`Content-Type: application/json`）。PDF/HTMLを返すエンドポイントのみ例外（後述）
- **認証**: なし。本アプリは単一ユーザー利用を前提としており、認証・認可は実装していない（[README](../../README.md)参照）
- **共通レスポンス構造**:
  - 一覧系APIは`{ リソース名(複数形): [...], total, page, limit }`の形式でページネーション情報を返す
  - 単票取得・作成・更新は対象オブジェクトをそのまま返す
  - エラーは常に`{ "error": "エラーメッセージ" }`形式（日本語の文言がそのまま返る）
- **共通パラメータ**:
  - 一覧系は`page`（デフォルト1）、`limit`（デフォルト20）でページネーション
  - `search`は対象カラムへの部分一致（`ILIKE`、大文字小文字区別なし）
  - 日付は`YYYY-MM-DD`形式の文字列（実在する日付であることもチェックされる）

## 顧客（Customers）

### GET /api/customers

顧客一覧を取得する（論理削除済みは除外）。

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| search | string | - | 顧客名・担当者名の部分一致検索 |
| page | number | - | ページ番号（デフォルト1） |
| limit | number | - | 1ページの件数（デフォルト20） |

**レスポンス例（200）**

```json
{
  "customers": [
    { "id": 1, "name": "株式会社テスト商事", "contact_name": "山田太郎", "phone": "03-1234-5678", "email": "yamada@example.com", "created_at": "2026-01-10T09:00:00.000Z" }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### GET /api/customers/:id

顧客1件を取得する。

**レスポンス例（200）**

```json
{
  "id": 1,
  "name": "株式会社テスト商事",
  "contact_name": "山田太郎",
  "postal_code": "150-0001",
  "address": "東京都渋谷区...",
  "phone": "03-1234-5678",
  "email": "yamada@example.com",
  "notes": null
}
```

**エラー**: 存在しないID → `404 { "error": "顧客が見つかりません" }`

### POST /api/customers

顧客を新規作成する。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| name | string | ✓ | 顧客名（100文字以内） |
| contact_name | string | - | 担当者名 |
| postal_code | string | - | 郵便番号 |
| address | string | - | 住所 |
| phone | string | - | 電話番号 |
| email | string | - | メールアドレス（`@`を含む形式チェックのみ） |
| notes | string | - | 備考 |

**レスポンス**: `201` + 作成された顧客オブジェクト

**バリデーションエラー例（400）**

```json
{ "error": "顧客名は必須です" }
```

```json
{ "error": "メールアドレスの形式が正しくありません" }
```

### PUT /api/customers/:id

顧客を更新する。リクエストボディはPOSTと同様。`404`（存在しない場合）/`400`（バリデーション）。

### DELETE /api/customers/:id

顧客を論理削除する（`is_deleted = 1`に更新。物理削除はしない）。

**レスポンス例（200）**: `{ "message": "顧客を削除しました" }`

## 品目マスタ：大項目（Item Categories）

### GET /api/item-categories

大項目一覧を取得する。各大項目に紐づく小項目数（`item_count`、論理削除済みは除外）を含む。`sort_order`昇順。

**レスポンス例（200）**

```json
[
  { "id": 1, "name": "Web制作", "sort_order": 0, "item_count": "3" }
]
```

### GET /api/item-categories/:id

大項目1件を取得する。`404`: `{ "error": "大項目が見つかりません" }`

### POST /api/item-categories

大項目を作成する。`sort_order`は既存の最大値+1が自動付与される。

**リクエストボディ**: `{ "name": string }`（必須）
**バリデーションエラー（400）**: `{ "error": "大項目名は必須です" }`

### PUT /api/item-categories/:id

大項目名を更新する。バリデーション・404はPOSTと同様。

### DELETE /api/item-categories/:id

大項目を論理削除する。**小項目が1件でも存在する場合は削除不可。**

**エラー例（400）**: `{ "error": "小項目が存在するため削除できません" }`

### PATCH /api/item-categories/:id/sort

表示順を1つ前後に入れ替える。

**リクエストボディ**: `{ "direction": "up" | "down" }`

**レスポンス**: 並び替え後の大項目一覧（GET一覧と同じ形式の配列）

## 品目マスタ：小項目（Items）

大項目にネストしたリソース。

### GET /api/item-categories/:categoryId/items

指定した大項目に属する小項目一覧を取得する（`sort_order`昇順）。

### GET /api/item-categories/:categoryId/items/:itemId

小項目1件を取得する。`404`: `{ "error": "小項目が見つかりません" }`

### POST /api/item-categories/:categoryId/items

小項目を作成する。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| name | string | ✓ | 小項目名 |
| unit | string | - | 単位（個・時間など） |
| unit_price | number | - | 単価（未指定時は0） |
| description | string | - | 説明 |

**エラー**: `name`未指定 → `400 { "error": "小項目名は必須です" }`、`categoryId`が存在しない → `404 { "error": "大項目が見つかりません" }`

### PUT /api/item-categories/:categoryId/items/:itemId

小項目を更新する。リクエストボディはPOSTと同様。

### DELETE /api/item-categories/:categoryId/items/:itemId

小項目を論理削除する。

### PATCH /api/item-categories/:categoryId/items/:itemId/sort

同一大項目内での表示順入れ替え。リクエストボディは`{ "direction": "up" | "down" }`。

## 見積書（Estimates）

### GET /api/estimates

見積書一覧を取得する。

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|---|---|---|---|
| search | string | - | 見積番号・件名・顧客名の部分一致 |
| page, limit | number | - | ページネーション |
| date_from, date_to | string (YYYY-MM-DD) | - | 発行日での絞り込み |
| customer_id | number | - | 顧客IDでの絞り込み |

**バリデーションエラー例（400）**

```json
{ "error": "date_fromの形式が正しくありません（YYYY-MM-DD）" }
```
```json
{ "error": "customer_idは数値で指定してください" }
```

**レスポンス例（200）**

```json
{
  "estimates": [
    {
      "id": 10, "estimate_number": "EST-2026-0001", "title": "Webサイト制作",
      "issue_date": "2026-06-01", "expiry_date": "2026-07-01",
      "status_estimate": 1, "status_order": 0, "status_delivery": 0, "status_invoice": 0,
      "total": 110000, "customer_name": "株式会社テスト商事"
    }
  ],
  "total": 1, "page": 1, "limit": 20
}
```

### GET /api/estimates/:id

見積書1件を、明細（`items`）・関連請求書情報（`invoice`、未発行なら`null`）付きで取得する。`404`: `{ "error": "見積書が見つかりません" }`

### POST /api/estimates

見積書を新規作成する。見積番号は`EST-{年}-{4桁連番}`形式でサーバー側が自動採番する。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| customer_id | number | ✓ | 顧客ID |
| issue_date | string | ✓ | 発行日（YYYY-MM-DD） |
| items | array | ✓ | 明細（1件以上）。各要素: `item_id?, category_name?, item_name, description?, quantity, unit?, unit_price, amount` |
| title | string | - | 件名 |
| expiry_date | string | - | 有効期限 |
| tax_rate | number | - | 消費税率（デフォルト10） |
| notes, terms | string | - | 備考・取引条件 |

小計・税額・合計はサーバー側で`items`から再計算される（クライアントから送られた金額は信用せず、`amount`の合計から算出）。

**バリデーションエラー例（400）**

```json
{ "error": "顧客は必須です" }
```
```json
{ "error": "明細が1行以上必要です" }
```

**レスポンス**: `201 { "id": 10, "estimate_number": "EST-2026-0001" }`

### PUT /api/estimates/:id

見積書を更新する。リクエストボディはPOSTと同様（`customer_id`変更も可）。明細は全件DELETE→INSERTで置き換えられる（差分更新ではない）。`404`/`400`はPOSTと同様。

### PATCH /api/estimates/:id/status

4つの独立ステータスフラグ（`status_estimate` / `status_order` / `status_delivery` / `status_invoice`）のいずれか1つをON/OFFする。

**リクエストボディ**: `{ "key": "status_order", "value": true }`

**エラー**: `key`が上記4つ以外 → `400 { "error": "無効なステータス項目です" }`

**レスポンス例（200）**: `{ "id": 10, "key": "status_order", "value": true }`

## 請求書（Invoices）

### GET /api/invoices

請求書一覧を取得する。クエリパラメータは見積書一覧と同様（`search`, `page`, `limit`, `date_from`, `date_to`, `customer_id`）。

**レスポンス例（200）**

```json
{
  "invoices": [
    {
      "id": 5, "invoice_number": "INV-2026-0001", "title": "Webサイト制作",
      "issue_date": "2026-06-10", "due_date": "2026-07-10", "total": 110000,
      "payment_status": 0, "paid_date": null,
      "estimate_id": 10, "estimate_number": "EST-2026-0001",
      "customer_name": "株式会社テスト商事"
    }
  ],
  "total": 1, "page": 1, "limit": 20
}
```

### GET /api/invoices/:id

請求書1件を明細（`items`）付きで取得する。`404`: `{ "error": "請求書が見つかりません" }`

### POST /api/invoices

見積書から請求書を作成する（見積の明細・金額をすべてコピーし、`estimates.status_invoice`を自動でONにする）。

**リクエストボディ**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| estimate_id | number | ✓ | 元になる見積書ID |
| issue_date | string | - | 発行日（未指定時は当日） |
| due_date | string | - | 支払期限 |

**バリデーションエラー（400）**: `{ "error": "見積書IDは必須です" }`
**存在しない見積書（404）**: `{ "error": "見積書が見つかりません" }`

**二重請求エラー（409）**: 1見積につき1請求のみ許可されており、既に請求書が存在する場合は事前チェックで以下を返す。

```json
{ "error": "この見積書の請求書は既に作成されています", "invoice_id": 5 }
```

また、同時リクエストなど競合状態でDBのUNIQUE制約（`invoices.estimate_id`）に違反した場合も同じ409として処理される（事前チェックをすり抜けた場合のフォールバック）。

**レスポンス**: `201 { "id": 5, "invoice_number": "INV-2026-0001" }`

### PUT /api/invoices/:id

請求書の件名・日付・備考・明細を更新する。税率は既存値を引き継ぎ、小計・税額・合計はサーバー側で再計算される。

**リクエストボディ**: `{ title?, issue_date(必須), due_date?, notes?, items(1件以上必須) }`

**バリデーションエラー（400）**: `{ "error": "請求日は必須です" }` / `{ "error": "明細が1行以上必要です" }`

### PATCH /api/invoices/:id/payment-status

入金ステータスを更新する。

**リクエストボディ**: `{ "payment_status": 0 | 1, "paid_date"?: "YYYY-MM-DD" }`

**バリデーションエラー（400）**: `{ "error": "payment_statusは0または1を指定してください" }` / `{ "error": "paid_dateの形式が正しくありません（YYYY-MM-DD）" }`

**レスポンス例（200）**: `{ "id": 5, "payment_status": 1, "paid_date": "2026-06-19" }`

## ダッシュボード（Dashboard）

### GET /api/dashboard

指定期間の集計情報を取得する。

**クエリパラメータ**: `date_from`, `date_to`（いずれも省略可、`YYYY-MM-DD`）

**レスポンス例（200）**

```json
{
  "monthlyInvoiceTotal": 330000,
  "pendingEstimateCount": 2,
  "monthlyEstimateCount": 5,
  "statusCounts": { "estimate": 5, "order": 3, "delivery": 1, "invoice": 1 },
  "unpaidInvoices": [
    { "id": 5, "invoice_number": "INV-2026-0001", "issue_date": "2026-06-10", "due_date": "2026-07-10", "total": 110000, "customer_name": "株式会社テスト商事" }
  ]
}
```

`pendingEstimateCount`は「見積済みだが、注文・納品・請求のいずれも未着手」の件数。`unpaidInvoices`は未払いの請求書を支払期限の早い順（期限未設定は末尾）に列挙し、期間フィルタは適用されない（常に全件から抽出）。

## 設定（Settings：自社情報）

### GET /api/settings

自社情報（PDF出力・印鑑欄用）を取得する。1レコードのみ運用（`ORDER BY id LIMIT 1`）。

**レスポンス例（200）**

```json
{
  "id": 1, "company_name": "自社株式会社", "representative_name": "代表 花子",
  "postal_code": "100-0001", "address": "東京都千代田区...",
  "phone": "03-0000-0000", "fax": null, "email": "info@example.com",
  "invoice_registration_number": "T1234567890123",
  "bank_name": "○○銀行", "bank_branch": "本店", "bank_account_type": "普通",
  "bank_account_number": "1234567", "bank_account_holder": "ジシャ カブシキガイシャ",
  "seal_label": "印", "created_at": "...", "updated_at": "..."
}
```

**エラー**: レコード未作成（マイグレーション未実行など） → `404 { "error": "自社情報が見つかりません" }`

### PUT /api/settings

自社情報を更新する。全フィールドが文字列の各VARCHAR長に応じてバリデーションされる。

**バリデーションエラー例（400）**

```json
{ "error": "会社名は必須です" }
```
```json
{ "error": "会社名は255文字以内で入力してください" }
```
```json
{ "error": "メールアドレスの形式が正しくありません" }
```

## PDF出力・印刷（Print）

JSONではなく、HTMLまたはPDFバイナリを返す唯一のエンドポイント群。

| メソッド | パス | レスポンス | 説明 |
|---|---|---|---|
| GET | `/api/print/estimates/:id/print` | `text/html` | 見積書のブラウザ印刷用HTML（ページ読み込み時に`window.print()`を自動実行） |
| GET | `/api/print/estimates/:id/pdf` | `application/pdf` | 見積書PDF（Puppeteerでレンダリング） |
| GET | `/api/print/invoices/:id/print` | `text/html` | 請求書の印刷用HTML |
| GET | `/api/print/invoices/:id/pdf` | `application/pdf` | 請求書PDF |

PDFエンドポイントは`Content-Disposition: attachment; filename*=UTF-8''<見積/請求番号>.pdf`を付与する。

**エラー**:
- 対象が存在しない → `404`（`/print`は`text/plain`相当のプレーン文字列、`/pdf`は`{ "error": "..." }`のJSON）
- PDF生成（Chrome起動・レンダリング）失敗 → `500 { "error": "サーバーエラーが発生しました" }`。詳細はクライアントに返さず、サーバーログにのみ実行パス・エラースタックを出力する（[architecture.md](../architecture.md)のPDF生成フロー参照）

## エラーハンドリングの仕様

| ステータス | 発生条件 |
|---|---|
| 400 Bad Request | 必須項目の欠落、形式不正（日付・メール・数値ID）、文字数超過、業務ルール違反（小項目が存在する大項目の削除など） |
| 404 Not Found | パスパラメータで指定したリソースが存在しない、または論理削除済み |
| 409 Conflict | 1見積につき1請求の制約に違反（事前チェック、またはDBのUNIQUE制約違反のフォールバック） |
| 500 Internal Server Error | DB接続エラー、SQL実行エラー、PDF生成エラーなど、上記以外の予期しない例外 |

エラーレスポンスは常に`{ "error": string }`の単一形式。`409`の二重請求エラーのみ例外的に`invoice_id`を追加で含む（クライアントが既存請求書へ遷移できるようにするため）。

バリデーションは各コントローラ内で個別に実装されており、共通のバリデーションミドルウェアは存在しない（リクエストごとに`if`文で必須チェック・形式チェックを行う方式）。`500`系のエラーはほとんどのコントローラで`error.message`をログにも出さず固定文言を返すのみで、原因追跡には別途サーバーログの強化が必要な箇所が残っている。
