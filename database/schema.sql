-- ============================================================
-- 見積〜請求管理Webアプリ データベーススキーマ
-- DB: PostgreSQL（Neon サーバーレスPostgres）
-- 文字コード: UTF8
-- ============================================================

-- ------------------------------------------------------------
-- 共通: updated_at自動更新トリガー関数
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 顧客管理
-- ------------------------------------------------------------
CREATE TABLE customers (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(255)    NOT NULL, -- 顧客名（会社名・屋号）
  contact_name  VARCHAR(100), -- 担当者名
  postal_code   VARCHAR(10), -- 郵便番号
  address       VARCHAR(500), -- 住所
  phone         VARCHAR(20), -- 電話番号
  email         VARCHAR(255), -- メールアドレス
  notes         TEXT, -- 備考
  is_deleted    SMALLINT        NOT NULL DEFAULT 0, -- 論理削除フラグ
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 顧客（取引先）
CREATE INDEX idx_customers_name ON customers (name);
CREATE INDEX idx_customers_is_deleted ON customers (is_deleted);
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 品目マスタ：大項目
-- ------------------------------------------------------------
CREATE TABLE item_categories (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(255)    NOT NULL, -- 大項目名
  sort_order  INT             NOT NULL DEFAULT 0, -- 表示順
  is_deleted  SMALLINT        NOT NULL DEFAULT 0, -- 論理削除フラグ
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- 品目マスタ：大項目
CREATE INDEX idx_item_categories_sort_order ON item_categories (sort_order);
CREATE INDEX idx_item_categories_is_deleted ON item_categories (is_deleted);
CREATE TRIGGER trg_item_categories_updated_at
  BEFORE UPDATE ON item_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 品目マスタ：小項目（大項目に紐づく）
-- ------------------------------------------------------------
CREATE TABLE items (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id BIGINT          NOT NULL, -- 大項目ID
  name        VARCHAR(255)    NOT NULL, -- 小項目名
  unit        VARCHAR(20), -- 単位（式・時間・個など）
  unit_price  NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 単価（円）
  description TEXT, -- 説明
  sort_order  INT             NOT NULL DEFAULT 0, -- 表示順
  is_deleted  SMALLINT        NOT NULL DEFAULT 0, -- 論理削除フラグ
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_items_category
    FOREIGN KEY (category_id) REFERENCES item_categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);
-- 品目マスタ：小項目
CREATE INDEX idx_items_category_id ON items (category_id);
CREATE INDEX idx_items_sort_order ON items (sort_order);
CREATE INDEX idx_items_is_deleted ON items (is_deleted);
CREATE TRIGGER trg_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 見積書
-- ステータス: 見積・注文・納品・請求は独立したフラグとして個別にON/OFF可能
-- ------------------------------------------------------------
CREATE TABLE estimates (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id     BIGINT          NOT NULL, -- 顧客ID
  estimate_number VARCHAR(50)     NOT NULL, -- 見積番号
  title           VARCHAR(255), -- 件名
  issue_date      DATE            NOT NULL, -- 発行日
  expiry_date     DATE, -- 有効期限
  status_estimate SMALLINT        NOT NULL DEFAULT 1, -- 見積ステータスフラグ
  status_order    SMALLINT        NOT NULL DEFAULT 0, -- 注文ステータスフラグ
  status_delivery SMALLINT        NOT NULL DEFAULT 0, -- 納品ステータスフラグ
  status_invoice  SMALLINT        NOT NULL DEFAULT 0, -- 請求ステータスフラグ
  subtotal        NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 小計（税抜）
  tax_rate        NUMERIC(5, 2)   NOT NULL DEFAULT 10.00, -- 消費税率（%）
  tax_amount      NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 消費税額
  total           NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 合計（税込）
  notes           TEXT, -- 備考
  terms           TEXT, -- 取引条件
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_estimates_estimate_number UNIQUE (estimate_number),
  CONSTRAINT fk_estimates_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);
-- 見積書
CREATE INDEX idx_estimates_customer_id ON estimates (customer_id);
CREATE INDEX idx_estimates_issue_date ON estimates (issue_date);
CREATE TRIGGER trg_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 見積明細（行数制限なし）
-- マスタ変更の影響を受けないよう、作成時点の名称・単価をスナップショット保存
-- ------------------------------------------------------------
CREATE TABLE estimate_items (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estimate_id    BIGINT          NOT NULL, -- 見積書ID
  item_id        BIGINT, -- 品目マスタ参照（任意）
  line_number    INT             NOT NULL, -- 行番号
  category_name  VARCHAR(255), -- 大項目名（スナップショット）
  item_name      VARCHAR(255)    NOT NULL, -- 小項目名（スナップショット）
  description    TEXT, -- 明細説明
  quantity       NUMERIC(10, 2)  NOT NULL DEFAULT 1.00, -- 数量
  unit           VARCHAR(20), -- 単位
  unit_price     NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 単価（円）
  amount         NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 金額（数量×単価）
  created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_estimate_items_estimate
    FOREIGN KEY (estimate_id) REFERENCES estimates (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_estimate_items_item
    FOREIGN KEY (item_id) REFERENCES items (id)
    ON UPDATE CASCADE ON DELETE SET NULL
);
-- 見積明細
CREATE INDEX idx_estimate_items_estimate_id ON estimate_items (estimate_id);
CREATE INDEX idx_estimate_items_line_number ON estimate_items (estimate_id, line_number);
CREATE TRIGGER trg_estimate_items_updated_at
  BEFORE UPDATE ON estimate_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 請求書（見積書から引き継ぎ・1見積につき1請求）
-- ------------------------------------------------------------
CREATE TABLE invoices (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estimate_id     BIGINT          NOT NULL, -- 元見積書ID
  customer_id     BIGINT          NOT NULL, -- 顧客ID
  invoice_number  VARCHAR(50)     NOT NULL, -- 請求番号
  title           VARCHAR(255), -- 件名
  issue_date      DATE            NOT NULL, -- 発行日
  due_date        DATE, -- 支払期限
  subtotal        NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 小計（税抜）
  tax_rate        NUMERIC(5, 2)   NOT NULL DEFAULT 10.00, -- 消費税率（%）
  tax_amount      NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 消費税額
  total           NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 合計（税込）
  payment_status  SMALLINT        NOT NULL DEFAULT 0, -- 入金ステータス（0:未払い, 1:入金済み）
  paid_date       DATE, -- 入金日
  notes           TEXT, -- 備考
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_invoices_estimate_id UNIQUE (estimate_id),
  CONSTRAINT uk_invoices_invoice_number UNIQUE (invoice_number),
  CONSTRAINT fk_invoices_estimate
    FOREIGN KEY (estimate_id) REFERENCES estimates (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);
-- 請求書
CREATE INDEX idx_invoices_customer_id ON invoices (customer_id);
CREATE INDEX idx_invoices_issue_date ON invoices (issue_date);
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 請求明細（見積明細からコピー・スナップショット保存）
-- ------------------------------------------------------------
CREATE TABLE invoice_items (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id        BIGINT          NOT NULL, -- 請求書ID
  estimate_item_id  BIGINT, -- 元見積明細ID（任意）
  line_number       INT             NOT NULL, -- 行番号
  category_name     VARCHAR(255), -- 大項目名（スナップショット）
  item_name         VARCHAR(255)    NOT NULL, -- 小項目名（スナップショット）
  description       TEXT, -- 明細説明
  quantity          NUMERIC(10, 2)  NOT NULL DEFAULT 1.00, -- 数量
  unit              VARCHAR(20), -- 単位
  unit_price        NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 単価（円）
  amount            NUMERIC(12, 0)  NOT NULL DEFAULT 0, -- 金額（数量×単価）
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_invoice_items_estimate_item
    FOREIGN KEY (estimate_item_id) REFERENCES estimate_items (id)
    ON UPDATE CASCADE ON DELETE SET NULL
);
-- 請求明細
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_line_number ON invoice_items (invoice_id, line_number);
CREATE TRIGGER trg_invoice_items_updated_at
  BEFORE UPDATE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 自社情報（PDF出力・印鑑欄用）
-- 個人事業主向けのため1レコード想定
-- ------------------------------------------------------------
CREATE TABLE company_settings (
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
-- 自社情報（PDF・印鑑欄用）
CREATE TRIGGER trg_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
