-- ============================================================
-- マイグレーション: estimates.status (ENUM) → 個別フラグ4カラムへ移行
-- ============================================================

ALTER TABLE estimates
  ADD COLUMN status_estimate SMALLINT NOT NULL DEFAULT 0, -- 見積ステータスフラグ
  ADD COLUMN status_order    SMALLINT NOT NULL DEFAULT 0, -- 注文ステータスフラグ
  ADD COLUMN status_delivery SMALLINT NOT NULL DEFAULT 0, -- 納品ステータスフラグ
  ADD COLUMN status_invoice  SMALLINT NOT NULL DEFAULT 0; -- 請求ステータスフラグ

-- 既存の status 値を該当フラグに反映
-- 旧運用は固定順送り（見積→注文→納品→請求）だったため、
-- 到達済みのステータスは全てONにする
UPDATE estimates SET status_estimate = 1;
UPDATE estimates SET status_order    = 1 WHERE status IN ('注文', '納品', '請求');
UPDATE estimates SET status_delivery = 1 WHERE status IN ('納品', '請求');
UPDATE estimates SET status_invoice  = 1 WHERE status = '請求';

DROP INDEX IF EXISTS idx_estimates_status;

ALTER TABLE estimates
  DROP COLUMN status;
