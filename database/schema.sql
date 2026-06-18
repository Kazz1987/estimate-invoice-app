-- ============================================================
-- 見積〜請求管理Webアプリ データベーススキーマ
-- DB: MySQL 8.x
-- 文字コード: utf8mb4
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ------------------------------------------------------------
-- 顧客管理
-- ------------------------------------------------------------
CREATE TABLE customers (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(255)    NOT NULL COMMENT '顧客名（会社名・屋号）',
  contact_name  VARCHAR(100)             COMMENT '担当者名',
  postal_code   VARCHAR(10)              COMMENT '郵便番号',
  address       VARCHAR(500)             COMMENT '住所',
  phone         VARCHAR(20)              COMMENT '電話番号',
  email         VARCHAR(255)             COMMENT 'メールアドレス',
  notes         TEXT                     COMMENT '備考',
  is_deleted    TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '論理削除フラグ',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_customers_name (name),
  INDEX idx_customers_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='顧客（取引先）';

-- ------------------------------------------------------------
-- 品目マスタ：大項目
-- ------------------------------------------------------------
CREATE TABLE item_categories (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255)    NOT NULL COMMENT '大項目名',
  sort_order  INT             NOT NULL DEFAULT 0 COMMENT '表示順',
  is_deleted  TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '論理削除フラグ',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_item_categories_sort_order (sort_order),
  INDEX idx_item_categories_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='品目マスタ：大項目';

-- ------------------------------------------------------------
-- 品目マスタ：小項目（大項目に紐づく）
-- ------------------------------------------------------------
CREATE TABLE items (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL COMMENT '大項目ID',
  name        VARCHAR(255)    NOT NULL COMMENT '小項目名',
  unit        VARCHAR(20)              COMMENT '単位（式・時間・個など）',
  unit_price  DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '単価（円）',
  description TEXT                     COMMENT '説明',
  sort_order  INT             NOT NULL DEFAULT 0 COMMENT '表示順',
  is_deleted  TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '論理削除フラグ',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_items_category_id (category_id),
  INDEX idx_items_sort_order (sort_order),
  INDEX idx_items_is_deleted (is_deleted),
  CONSTRAINT fk_items_category
    FOREIGN KEY (category_id) REFERENCES item_categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='品目マスタ：小項目';

-- ------------------------------------------------------------
-- 見積書
-- ステータス: 見積・注文・納品・請求は独立したフラグとして個別にON/OFF可能
-- ------------------------------------------------------------
CREATE TABLE estimates (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id     BIGINT UNSIGNED NOT NULL COMMENT '顧客ID',
  estimate_number VARCHAR(50)     NOT NULL COMMENT '見積番号',
  title           VARCHAR(255)             COMMENT '件名',
  issue_date      DATE            NOT NULL COMMENT '発行日',
  expiry_date     DATE                     COMMENT '有効期限',
  status_estimate TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '見積ステータスフラグ',
  status_order    TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '注文ステータスフラグ',
  status_delivery TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '納品ステータスフラグ',
  status_invoice  TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '請求ステータスフラグ',
  subtotal        DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '小計（税抜）',
  tax_rate        DECIMAL(5, 2)   NOT NULL DEFAULT 10.00 COMMENT '消費税率（%）',
  tax_amount      DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '消費税額',
  total           DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '合計（税込）',
  notes           TEXT                     COMMENT '備考',
  terms           TEXT                     COMMENT '取引条件',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_estimates_estimate_number (estimate_number),
  INDEX idx_estimates_customer_id (customer_id),
  INDEX idx_estimates_issue_date (issue_date),
  CONSTRAINT fk_estimates_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='見積書';

-- ------------------------------------------------------------
-- 見積明細（行数制限なし）
-- マスタ変更の影響を受けないよう、作成時点の名称・単価をスナップショット保存
-- ------------------------------------------------------------
CREATE TABLE estimate_items (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  estimate_id    BIGINT UNSIGNED NOT NULL COMMENT '見積書ID',
  item_id        BIGINT UNSIGNED          COMMENT '品目マスタ参照（任意）',
  line_number    INT             NOT NULL COMMENT '行番号',
  category_name  VARCHAR(255)             COMMENT '大項目名（スナップショット）',
  item_name      VARCHAR(255)    NOT NULL COMMENT '小項目名（スナップショット）',
  description    TEXT                     COMMENT '明細説明',
  quantity       DECIMAL(10, 2)  NOT NULL DEFAULT 1.00 COMMENT '数量',
  unit           VARCHAR(20)              COMMENT '単位',
  unit_price     DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '単価（円）',
  amount         DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '金額（数量×単価）',
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_estimate_items_estimate_id (estimate_id),
  INDEX idx_estimate_items_line_number (estimate_id, line_number),
  CONSTRAINT fk_estimate_items_estimate
    FOREIGN KEY (estimate_id) REFERENCES estimates (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_estimate_items_item
    FOREIGN KEY (item_id) REFERENCES items (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='見積明細';

-- ------------------------------------------------------------
-- 請求書（見積書から引き継ぎ・1見積につき1請求）
-- ------------------------------------------------------------
CREATE TABLE invoices (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  estimate_id     BIGINT UNSIGNED NOT NULL COMMENT '元見積書ID',
  customer_id     BIGINT UNSIGNED NOT NULL COMMENT '顧客ID',
  invoice_number  VARCHAR(50)     NOT NULL COMMENT '請求番号',
  title           VARCHAR(255)             COMMENT '件名',
  issue_date      DATE            NOT NULL COMMENT '発行日',
  due_date        DATE                     COMMENT '支払期限',
  subtotal        DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '小計（税抜）',
  tax_rate        DECIMAL(5, 2)   NOT NULL DEFAULT 10.00 COMMENT '消費税率（%）',
  tax_amount      DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '消費税額',
  total           DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '合計（税込）',
  notes           TEXT                     COMMENT '備考',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_invoices_estimate_id (estimate_id),
  UNIQUE KEY uk_invoices_invoice_number (invoice_number),
  INDEX idx_invoices_customer_id (customer_id),
  INDEX idx_invoices_issue_date (issue_date),
  CONSTRAINT fk_invoices_estimate
    FOREIGN KEY (estimate_id) REFERENCES estimates (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='請求書';

-- ------------------------------------------------------------
-- 請求明細（見積明細からコピー・スナップショット保存）
-- ------------------------------------------------------------
CREATE TABLE invoice_items (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_id     BIGINT UNSIGNED NOT NULL COMMENT '請求書ID',
  estimate_item_id BIGINT UNSIGNED        COMMENT '元見積明細ID（任意）',
  line_number    INT             NOT NULL COMMENT '行番号',
  category_name  VARCHAR(255)             COMMENT '大項目名（スナップショット）',
  item_name      VARCHAR(255)    NOT NULL COMMENT '小項目名（スナップショット）',
  description    TEXT                     COMMENT '明細説明',
  quantity       DECIMAL(10, 2)  NOT NULL DEFAULT 1.00 COMMENT '数量',
  unit           VARCHAR(20)              COMMENT '単位',
  unit_price     DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '単価（円）',
  amount         DECIMAL(12, 0)  NOT NULL DEFAULT 0 COMMENT '金額（数量×単価）',
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_invoice_items_invoice_id (invoice_id),
  INDEX idx_invoice_items_line_number (invoice_id, line_number),
  CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_invoice_items_estimate_item
    FOREIGN KEY (estimate_item_id) REFERENCES estimate_items (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='請求明細';

-- ------------------------------------------------------------
-- 自社情報（PDF出力・印鑑欄用）
-- 個人事業主向けのため1レコード想定
-- ------------------------------------------------------------
CREATE TABLE company_settings (
  id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_name                VARCHAR(255)    NOT NULL COMMENT '屋号・会社名',
  representative_name         VARCHAR(100)             COMMENT '代表者名',
  postal_code                 VARCHAR(10)              COMMENT '郵便番号',
  address                     VARCHAR(500)             COMMENT '住所',
  phone                       VARCHAR(20)              COMMENT '電話番号',
  fax                         VARCHAR(20)              COMMENT 'FAX番号',
  email                       VARCHAR(255)             COMMENT 'メールアドレス',
  invoice_registration_number VARCHAR(20)              COMMENT 'インボイス登録番号（T+13桁）',
  bank_name                   VARCHAR(100)             COMMENT '振込先：銀行名',
  bank_branch                 VARCHAR(100)             COMMENT '振込先：支店名',
  bank_account_type           VARCHAR(20)              COMMENT '振込先：口座種別',
  bank_account_number         VARCHAR(20)              COMMENT '振込先：口座番号',
  bank_account_holder         VARCHAR(100)             COMMENT '振込先：口座名義',
  seal_label                  VARCHAR(50)     NOT NULL DEFAULT '印' COMMENT '印鑑欄ラベル',
  created_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自社情報（PDF・印鑑欄用）';
