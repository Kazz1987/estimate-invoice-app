-- ============================================================
-- マイグレーション: 自社情報設定機能の追加
-- company_settings テーブルを新規作成（1レコードのみ運用）
-- ============================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_name                VARCHAR(255)    NOT NULL, -- 屋号・会社名
  representative_name         VARCHAR(100), -- 代表者名
  postal_code                 VARCHAR(10), -- 郵便番号
  address                     VARCHAR(500), -- 住所
  phone                       VARCHAR(20), -- 電話番号
  fax                         VARCHAR(20), -- FAX番号
  email                       VARCHAR(255), -- メールアドレス
  invoice_registration_number VARCHAR(20), -- インボイス登録番号（T+13桁）
  bank_name                   VARCHAR(100), -- 振込先：銀行名
  bank_branch                 VARCHAR(100), -- 振込先：支店名
  bank_account_type           VARCHAR(20), -- 振込先：口座種別
  bank_account_number         VARCHAR(20), -- 振込先：口座番号
  bank_account_holder         VARCHAR(100), -- 振込先：口座名義
  seal_label                  VARCHAR(50)     NOT NULL DEFAULT '印', -- 印鑑欄ラベル
  created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- テーブルが先行して作成済み（fax列なし）の場合に備えた追加
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS fax VARCHAR(20); -- FAX番号

-- 初期レコードが存在しない場合のみ、空の1レコードを投入
INSERT INTO company_settings (company_name)
SELECT '自社名を入力してください'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);
