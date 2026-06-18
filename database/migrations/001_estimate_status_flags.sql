-- ============================================================
-- マイグレーション: estimates.status (ENUM) → 個別フラグ4カラムへ移行
-- ============================================================

ALTER TABLE estimates
  ADD COLUMN status_estimate TINYINT(1) NOT NULL DEFAULT 0 COMMENT '見積ステータスフラグ' AFTER expiry_date,
  ADD COLUMN status_order    TINYINT(1) NOT NULL DEFAULT 0 COMMENT '注文ステータスフラグ' AFTER status_estimate,
  ADD COLUMN status_delivery TINYINT(1) NOT NULL DEFAULT 0 COMMENT '納品ステータスフラグ' AFTER status_order,
  ADD COLUMN status_invoice  TINYINT(1) NOT NULL DEFAULT 0 COMMENT '請求ステータスフラグ' AFTER status_delivery;

-- 既存の status 値を該当フラグに反映
-- 旧運用は固定順送り（見積→注文→納品→請求）だったため、
-- 到達済みのステータスは全てONにする
UPDATE estimates SET status_estimate = 1;
UPDATE estimates SET status_order    = 1 WHERE status IN ('注文', '納品', '請求');
UPDATE estimates SET status_delivery = 1 WHERE status IN ('納品', '請求');
UPDATE estimates SET status_invoice  = 1 WHERE status = '請求';

ALTER TABLE estimates
  DROP INDEX idx_estimates_status,
  DROP COLUMN status;
