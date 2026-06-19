// ポートフォリオ用リアルサンプルデータ投入スクリプト
// 実行: node scripts/seedSampleData.js （server/ ディレクトリで実行）
// 冪等性: トランザクションデータ・品目マスタをTRUNCATEしてから再生成するため、何度実行しても同じ結果になる。
// company_settings は変更しない。
import 'dotenv/config';
import pool from '../src/config/database.js';

const TAX_RATE = 10.00;

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgoDate(n) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

// ------------------------------------------------------------
// 品目マスタ
// ------------------------------------------------------------
const CATEGORIES = ['デザイン', '開発', '工事', '店舗関連', 'コンサルティング', '保守'];

const ITEMS = [
  { category: 'デザイン', name: 'LP制作', unit: '式', unitPrice: 150000 },
  { category: 'デザイン', name: 'ロゴ制作', unit: '式', unitPrice: 80000 },
  { category: 'デザイン', name: '店舗ロゴ・看板デザイン', unit: '式', unitPrice: 120000 },
  { category: '開発', name: 'Webアプリ開発', unit: '式', unitPrice: 300000 },
  { category: '開発', name: 'ECサイト構築', unit: '式', unitPrice: 450000 },
  { category: '開発', name: 'システム保守', unit: '月', unitPrice: 30000 },
  { category: '工事', name: '内装工事', unit: '式', unitPrice: 1200000 },
  { category: '工事', name: '外壁塗装', unit: '式', unitPrice: 850000 },
  { category: '工事', name: '小規模リフォーム', unit: '式', unitPrice: 350000 },
  { category: '店舗関連', name: '店舗内装デザイン', unit: '式', unitPrice: 600000 },
  { category: '店舗関連', name: 'メニュー撮影・印刷', unit: '式', unitPrice: 90000 },
  { category: '店舗関連', name: 'POPデザイン', unit: '式', unitPrice: 40000 },
  { category: 'コンサルティング', name: '顧問契約', unit: '月', unitPrice: 50000 },
  { category: 'コンサルティング', name: '法務相談', unit: '時間', unitPrice: 20000 },
  { category: 'コンサルティング', name: '労務相談', unit: '時間', unitPrice: 15000 },
  { category: '保守', name: '月次保守', unit: '月', unitPrice: 30000 },
  { category: '保守', name: 'サーバー保守', unit: '月', unitPrice: 25000 },
];

// ------------------------------------------------------------
// 顧客（10社・5業種×2社）
// ------------------------------------------------------------
const CUSTOMERS = [
  { name: '株式会社湊建設', contact_name: '湊川 健太', postal_code: '135-0061', address: '東京都江東区豊洲3-12-5 湊洲ビル4F', phone: '03-5678-1234', email: 'info@minato-kensetsu.example.jp' },
  { name: '大地土木株式会社', contact_name: '大原 誠', postal_code: '220-0012', address: '神奈川県横浜市西区みなとみらい2-3-8', phone: '045-987-6543', email: 'contact@daichi-doboku.example.jp' },
  { name: '株式会社キッチン花房', contact_name: '花房 美咲', postal_code: '530-0001', address: '大阪府大阪市北区梅田1-2-3 梅田パークビル2F', phone: '06-6321-4567', email: 'info@hanabusatei.example.jp' },
  { name: '麦酒酒場 風花', contact_name: '風間 隆', postal_code: '460-0008', address: '愛知県名古屋市中区栄3-15-1', phone: '052-321-9876', email: 'kazehana@izakaya.example.jp' },
  { name: '株式会社Nagomiセレクト', contact_name: '和泉 玲奈', postal_code: '810-0001', address: '福岡県福岡市中央区天神2-4-6 天神フロントタワー8F', phone: '092-711-2345', email: 'nagomi@select.example.jp' },
  { name: '雑貨と暮らし つむぎ', contact_name: '紡木 さくら', postal_code: '600-8001', address: '京都府京都市下京区四条通5-1', phone: '075-221-3344', email: 'tsumugi@zakka.example.jp' },
  { name: '株式会社クラウドギア', contact_name: '黒田 翔', postal_code: '150-0031', address: '東京都渋谷区桜丘町20-1 渋谷桜丘スクエア5F', phone: '03-4567-8901', email: 'dev@cloudgear.example.jp' },
  { name: 'テックブリッジ合同会社', contact_name: '橋本 拓也', postal_code: '532-0011', address: '大阪府大阪市淀川区西中島4-2-9', phone: '06-7890-1234', email: 'pm@techbridge.example.jp' },
  { name: '山本社会保険労務士事務所', contact_name: '山本 哲也', postal_code: '330-0843', address: '埼玉県さいたま市大宮区桜木町1-7-2', phone: '048-123-4567', email: 'yamamoto-sr@office.example.jp' },
  { name: '中村法律事務所', contact_name: '中村 由美', postal_code: '100-0013', address: '東京都千代田区霞が関1-1-1 霞が関コートビル10F', phone: '03-3210-9876', email: 'nakamura-law@office.example.jp' },
];

// ------------------------------------------------------------
// 見積書 30件
// stage: A=見積のみ / B=見積+注文 / C=見積+注文+納品 / D=全フラグON（請求書も生成）
// payment（D限定）: paid=入金済み / overdue=未払い・期限超過 / notdue=未払い・期限前
// ------------------------------------------------------------
const STAGE_FLAGS = {
  A: [1, 0, 0, 0],
  B: [1, 1, 0, 0],
  C: [1, 1, 1, 0],
  D: [1, 1, 1, 1],
};

const ESTIMATES = [
  { customer: 0, title: '外壁塗装工事', daysAgo: 160, stage: 'D', payment: 'paid', items: [{ name: '外壁塗装', qty: 1 }] },
  { customer: 0, title: 'オフィス内装工事', daysAgo: 50, stage: 'D', payment: 'overdue', items: [{ name: '内装工事', qty: 1 }] },
  { customer: 0, title: '倉庫リフォーム', daysAgo: 20, stage: 'B', items: [{ name: '小規模リフォーム', qty: 1 }] },

  { customer: 1, title: '駐車場舗装工事', daysAgo: 150, stage: 'D', payment: 'paid', items: [{ name: '小規模リフォーム', qty: 2 }] },
  { customer: 1, title: '外壁塗装工事（本社）', daysAgo: 45, stage: 'C', items: [{ name: '外壁塗装', qty: 1 }] },
  { customer: 1, title: '新規倉庫建設見積', daysAgo: 10, stage: 'A', items: [{ name: '内装工事', qty: 1 }] },

  { customer: 2, title: '店舗内装リニューアル', daysAgo: 140, stage: 'D', payment: 'paid', items: [{ name: '店舗内装デザイン', qty: 1 }] },
  { customer: 2, title: 'メニュー撮影・印刷', daysAgo: 25, stage: 'B', items: [{ name: 'メニュー撮影・印刷', qty: 1 }] },
  { customer: 2, title: '看板デザイン制作', daysAgo: 5, stage: 'A', items: [{ name: '店舗ロゴ・看板デザイン', qty: 1 }] },

  { customer: 3, title: '店舗ロゴ制作', daysAgo: 120, stage: 'D', payment: 'paid', items: [{ name: 'ロゴ制作', qty: 1 }] },
  { customer: 3, title: 'POPデザイン制作', daysAgo: 18, stage: 'B', items: [{ name: 'POPデザイン', qty: 3 }] },
  { customer: 3, title: '店内改装（小規模）', daysAgo: 8, stage: 'A', items: [{ name: '小規模リフォーム', qty: 1 }] },

  { customer: 4, title: 'ECサイト構築', daysAgo: 110, stage: 'D', payment: 'paid', items: [{ name: 'ECサイト構築', qty: 1 }] },
  { customer: 4, title: 'ロゴリブランディング', daysAgo: 18, stage: 'D', payment: 'notdue', items: [{ name: 'ロゴ制作', qty: 1 }] },
  { customer: 4, title: '店舗POPデザイン', daysAgo: 15, stage: 'B', items: [{ name: 'POPデザイン', qty: 2 }] },

  { customer: 5, title: '店舗内装デザイン', daysAgo: 95, stage: 'D', payment: 'paid', items: [{ name: '店舗内装デザイン', qty: 1 }] },
  { customer: 5, title: 'ECサイト構築（小規模）', daysAgo: 50, stage: 'C', items: [{ name: 'ECサイト構築', qty: 1 }] },
  { customer: 5, title: 'LP制作', daysAgo: 3, stage: 'A', items: [{ name: 'LP制作', qty: 1 }] },

  { customer: 6, title: 'Webアプリ開発（管理画面）', daysAgo: 85, stage: 'D', payment: 'paid', items: [{ name: 'Webアプリ開発', qty: 1 }] },
  { customer: 6, title: 'システム保守（年間契約）', daysAgo: 12, stage: 'D', payment: 'notdue', items: [{ name: 'システム保守', qty: 6 }] },
  { customer: 6, title: '新機能追加開発', daysAgo: 14, stage: 'B', items: [{ name: 'Webアプリ開発', qty: 1 }] },

  { customer: 7, title: 'ECサイト構築（受託）', daysAgo: 45, stage: 'D', payment: 'overdue', items: [{ name: 'ECサイト構築', qty: 1 }] },
  { customer: 7, title: 'Webアプリ開発（受託）', daysAgo: 25, stage: 'D', payment: 'notdue', items: [{ name: 'Webアプリ開発', qty: 2 }] },
  { customer: 7, title: 'システム保守契約', daysAgo: 55, stage: 'C', items: [{ name: 'システム保守', qty: 1 }] },

  { customer: 8, title: '顧問契約（半年分）', daysAgo: 175, stage: 'D', payment: 'paid', items: [{ name: '顧問契約', qty: 6 }] },
  { customer: 8, title: '労務相談（スポット）', daysAgo: 14, stage: 'A', items: [{ name: '労務相談', qty: 3 }] },
  { customer: 8, title: '顧問契約更新', daysAgo: 6, stage: 'A', items: [{ name: '顧問契約', qty: 3 }] },

  { customer: 9, title: '法務相談（契約書レビュー）', daysAgo: 130, stage: 'D', payment: 'paid', items: [{ name: '法務相談', qty: 4 }] },
  { customer: 9, title: '顧問契約（法律顧問）', daysAgo: 5, stage: 'D', payment: 'notdue', items: [{ name: '顧問契約', qty: 6 }] },
  { customer: 9, title: '法務相談（新規相談）', daysAgo: 2, stage: 'A', items: [{ name: '法務相談', qty: 2 }] },
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ---- トランザクションデータ・品目マスタをクリア（company_settingsは保持） ----
    // RESTART IDENTITYでID連番を1から振り直し、CASCADEで関連テーブルのFK制約に対応
    await client.query(
      `TRUNCATE TABLE invoice_items, invoices, estimate_items, estimates, customers, items, item_categories
       RESTART IDENTITY CASCADE`
    );

    // ---- 品目マスタ投入 ----
    const categoryIds = {};
    for (let i = 0; i < CATEGORIES.length; i++) {
      const { rows } = await client.query(
        'INSERT INTO item_categories (name, sort_order) VALUES ($1, $2) RETURNING id',
        [CATEGORIES[i], i + 1]
      );
      categoryIds[CATEGORIES[i]] = rows[0].id;
    }

    const itemIds = {};
    for (let i = 0; i < ITEMS.length; i++) {
      const it = ITEMS[i];
      const { rows } = await client.query(
        'INSERT INTO items (category_id, name, unit, unit_price, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [categoryIds[it.category], it.name, it.unit, it.unitPrice, i + 1]
      );
      itemIds[it.name] = rows[0].id;
    }

    // ---- 顧客投入 ----
    const customerIds = [];
    for (const c of CUSTOMERS) {
      const { rows } = await client.query(
        `INSERT INTO customers (name, contact_name, postal_code, address, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [c.name, c.contact_name, c.postal_code, c.address, c.phone, c.email]
      );
      customerIds.push(rows[0].id);
    }

    // ---- 見積書・請求書投入（古い順に処理して番号を年ごとに連番化） ----
    const ordered = [...ESTIMATES].sort((a, b) => b.daysAgo - a.daysAgo);
    const estimateSeq = {};
    const invoiceSeq = {};
    let estimateCount = 0;
    let invoiceCount = 0;

    for (const e of ordered) {
      const issueDate = daysAgoDate(e.daysAgo);
      const year = issueDate.getUTCFullYear();
      estimateSeq[year] = (estimateSeq[year] || 0) + 1;
      const estimateNumber = `EST-${year}-${String(estimateSeq[year]).padStart(4, '0')}`;

      const lineItems = e.items.map((it) => {
        const master = ITEMS.find((m) => m.name === it.name);
        return {
          name: it.name,
          category: master.category,
          qty: it.qty,
          unit: master.unit,
          unitPrice: master.unitPrice,
          amount: it.qty * master.unitPrice,
        };
      });
      const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
      const taxAmount = Math.floor(subtotal * TAX_RATE / 100);
      const total = subtotal + taxAmount;
      const flags = STAGE_FLAGS[e.stage];

      const { rows: estRows } = await client.query(
        `INSERT INTO estimates
           (customer_id, estimate_number, title, issue_date, expiry_date,
            status_estimate, status_order, status_delivery, status_invoice,
            subtotal, tax_rate, tax_amount, total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          customerIds[e.customer], estimateNumber, e.title, ymd(issueDate), ymd(addDays(issueDate, 30)),
          flags[0], flags[1], flags[2], flags[3],
          subtotal, TAX_RATE, taxAmount, total,
        ]
      );
      const estimateId = estRows[0].id;
      estimateCount++;

      const estimateItemIds = [];
      for (let i = 0; i < lineItems.length; i++) {
        const li = lineItems[i];
        const { rows: itemRows } = await client.query(
          `INSERT INTO estimate_items
             (estimate_id, item_id, line_number, category_name, item_name, quantity, unit, unit_price, amount)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [estimateId, itemIds[li.name], i + 1, li.category, li.name, li.qty, li.unit, li.unitPrice, li.amount]
        );
        estimateItemIds.push(itemRows[0].id);
      }

      if (e.stage === 'D') {
        const dueDate = addDays(issueDate, 30);
        let paymentStatus = 0;
        let paidDate = null;
        if (e.payment === 'paid') {
          paymentStatus = 1;
          paidDate = ymd(addDays(dueDate, -5));
        }

        invoiceSeq[year] = (invoiceSeq[year] || 0) + 1;
        const invoiceNumber = `INV-${year}-${String(invoiceSeq[year]).padStart(4, '0')}`;

        const { rows: invRows } = await client.query(
          `INSERT INTO invoices
             (estimate_id, customer_id, invoice_number, title, issue_date, due_date,
              subtotal, tax_rate, tax_amount, total, payment_status, paid_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING id`,
          [
            estimateId, customerIds[e.customer], invoiceNumber, e.title, ymd(issueDate), ymd(dueDate),
            subtotal, TAX_RATE, taxAmount, total, paymentStatus, paidDate,
          ]
        );
        const invoiceId = invRows[0].id;
        invoiceCount++;

        for (let i = 0; i < lineItems.length; i++) {
          const li = lineItems[i];
          await client.query(
            `INSERT INTO invoice_items
               (invoice_id, estimate_item_id, line_number, category_name, item_name, quantity, unit, unit_price, amount)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [invoiceId, estimateItemIds[i], i + 1, li.category, li.name, li.qty, li.unit, li.unitPrice, li.amount]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log(`完了: 顧客${customerIds.length}件 / 品目${ITEMS.length}件 / 見積${estimateCount}件 / 請求${invoiceCount}件`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('シード投入に失敗しました:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
