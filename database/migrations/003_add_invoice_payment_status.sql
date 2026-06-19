-- ============================================================
-- マイグレーション: invoices に入金ステータス管理カラムを追加
-- ============================================================

ALTER TABLE invoices
  ADD COLUMN payment_status SMALLINT NOT NULL DEFAULT 0, -- 入金ステータス（0:未払い, 1:入金済み）
  ADD COLUMN paid_date      DATE; -- 入金日
