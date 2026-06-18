-- ============================================================
-- サンプルデータ投入：品目マスタ・見積・請求
-- 顧客データは既存（株式会社サンプル商事/有限会社テスト工務店/フリーランス山田事務所）を利用
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 品目マスタ：大項目
-- ------------------------------------------------------------
INSERT INTO item_categories (name, sort_order)
VALUES
  ('デザイン', 1),
  ('開発', 2),
  ('保守', 3);

-- ------------------------------------------------------------
-- 品目マスタ：小項目
-- ------------------------------------------------------------
INSERT INTO items (category_id, name, unit, unit_price, sort_order)
VALUES
  ((SELECT id FROM item_categories WHERE name = 'デザイン'), 'LP制作', '式', 150000, 1),
  ((SELECT id FROM item_categories WHERE name = '開発'), 'Webアプリ開発', '式', 300000, 1),
  ((SELECT id FROM item_categories WHERE name = '保守'), '月次保守', '月', 30000, 1);

-- ------------------------------------------------------------
-- 見積1：株式会社サンプル商事 / LP制作 / 今月 / 見積のみON
-- ------------------------------------------------------------
INSERT INTO estimates
  (customer_id, estimate_number, title, issue_date, status_estimate, status_order, status_delivery, status_invoice,
   subtotal, tax_rate, tax_amount, total)
VALUES
  ((SELECT id FROM customers WHERE name = '株式会社サンプル商事'),
   'EST-2026-0001', 'LP制作', '2026-06-17', 1, 0, 0, 0,
   150000, 10.00, 15000, 165000);

INSERT INTO estimate_items
  (estimate_id, item_id, line_number, category_name, item_name, quantity, unit, unit_price, amount)
VALUES
  ((SELECT id FROM estimates WHERE estimate_number = 'EST-2026-0001'),
   (SELECT id FROM items WHERE name = 'LP制作'),
   1, 'デザイン', 'LP制作', 1.00, '式', 150000, 150000);

-- ------------------------------------------------------------
-- 見積2：有限会社テスト工務店 / Webアプリ開発 / 今月 / 見積・注文ON
-- ------------------------------------------------------------
INSERT INTO estimates
  (customer_id, estimate_number, title, issue_date, status_estimate, status_order, status_delivery, status_invoice,
   subtotal, tax_rate, tax_amount, total)
VALUES
  ((SELECT id FROM customers WHERE name = '有限会社テスト工務店'),
   'EST-2026-0002', 'Webアプリ開発', '2026-06-17', 1, 1, 0, 0,
   300000, 10.00, 30000, 330000);

INSERT INTO estimate_items
  (estimate_id, item_id, line_number, category_name, item_name, quantity, unit, unit_price, amount)
VALUES
  ((SELECT id FROM estimates WHERE estimate_number = 'EST-2026-0002'),
   (SELECT id FROM items WHERE name = 'Webアプリ開発'),
   1, '開発', 'Webアプリ開発', 1.00, '式', 300000, 300000);

-- ------------------------------------------------------------
-- 見積3：フリーランス山田事務所 / 月次保守 / 先月 / 見積・注文・納品・請求ON
-- ------------------------------------------------------------
INSERT INTO estimates
  (customer_id, estimate_number, title, issue_date, status_estimate, status_order, status_delivery, status_invoice,
   subtotal, tax_rate, tax_amount, total)
VALUES
  ((SELECT id FROM customers WHERE name = 'フリーランス山田事務所'),
   'EST-2026-0003', '月次保守', '2026-05-17', 1, 1, 1, 1,
   30000, 10.00, 3000, 33000);

INSERT INTO estimate_items
  (estimate_id, item_id, line_number, category_name, item_name, quantity, unit, unit_price, amount)
VALUES
  ((SELECT id FROM estimates WHERE estimate_number = 'EST-2026-0003'),
   (SELECT id FROM items WHERE name = '月次保守'),
   1, '保守', '月次保守', 1.00, '月', 30000, 30000);

-- ------------------------------------------------------------
-- 請求書：見積3件目（フリーランス山田事務所/月次保守）から作成済みとして投入
-- ------------------------------------------------------------
INSERT INTO invoices
  (estimate_id, customer_id, invoice_number, title, issue_date, due_date,
   subtotal, tax_rate, tax_amount, total)
VALUES
  ((SELECT id FROM estimates WHERE estimate_number = 'EST-2026-0003'),
   (SELECT id FROM customers WHERE name = 'フリーランス山田事務所'),
   'INV-2026-0001', '月次保守', '2026-05-17', '2026-06-30',
   30000, 10.00, 3000, 33000);

INSERT INTO invoice_items
  (invoice_id, estimate_item_id, line_number, category_name, item_name, quantity, unit, unit_price, amount)
VALUES
  ((SELECT id FROM invoices WHERE invoice_number = 'INV-2026-0001'),
   (SELECT id FROM estimate_items WHERE estimate_id = (SELECT id FROM estimates WHERE estimate_number = 'EST-2026-0003')),
   1, '保守', '月次保守', 1.00, '月', 30000, 30000);
