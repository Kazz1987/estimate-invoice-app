-- ============================================================
-- マイグレーション: invoices に入金ステータス管理カラムを追加
-- ============================================================

ALTER TABLE invoices
  ADD COLUMN payment_status TINYINT(1) NOT NULL DEFAULT 0 COMMENT '入金ステータス（0:未払い, 1:入金済み）' AFTER total,
  ADD COLUMN paid_date      DATE                          COMMENT '入金日' AFTER payment_status;
