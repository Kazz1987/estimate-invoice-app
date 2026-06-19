import pool from '../config/database.js';
import { isValidDateStr, isValidId } from '../utils/validation.js';

function calcTotals(items, taxRate) {
  const subtotal = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const tax_amount = Math.floor(subtotal * Number(taxRate) / 100);
  return { subtotal, tax_amount, total: subtotal + tax_amount };
}

async function genEstimateNumber(client) {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    `SELECT MAX(CAST(split_part(estimate_number, '-', 3) AS INTEGER)) AS "maxNum"
     FROM estimates WHERE estimate_number LIKE $1`,
    [`EST-${year}-%`]
  );
  const seq = String((rows[0].maxNum || 0) + 1).padStart(4, '0');
  return `EST-${year}-${seq}`;
}

async function upsertItems(client, estimateId, items) {
  await client.query('DELETE FROM estimate_items WHERE estimate_id = $1', [estimateId]);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await client.query(`
      INSERT INTO estimate_items
        (estimate_id, item_id, line_number, category_name, item_name,
         description, quantity, unit, unit_price, amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      estimateId,
      it.item_id || null,
      i + 1,
      it.category_name || null,
      it.item_name || '',
      it.description || null,
      Number(it.quantity) || 1,
      it.unit || null,
      Number(it.unit_price) || 0,
      Number(it.amount) || 0,
    ]);
  }
}

export async function getEstimates(req, res) {
  try {
    const { search = '', page = 1, limit = 20, date_from, date_to, customer_id } = req.query;

    if (date_from && !isValidDateStr(date_from)) {
      return res.status(400).json({ error: 'date_fromの形式が正しくありません（YYYY-MM-DD）' });
    }
    if (date_to && !isValidDateStr(date_to)) {
      return res.status(400).json({ error: 'date_toの形式が正しくありません（YYYY-MM-DD）' });
    }
    if (customer_id && !isValidId(customer_id)) {
      return res.status(400).json({ error: 'customer_idは数値で指定してください' });
    }

    const offset = (Number(page) - 1) * Number(limit);
    const like = `%${search}%`;

    let where = '(e.estimate_number ILIKE $1 OR e.title ILIKE $2 OR c.name ILIKE $3)';
    const params = [like, like, like];
    if (date_from) { params.push(date_from); where += ` AND e.issue_date >= $${params.length}`; }
    if (date_to)   { params.push(date_to); where += ` AND e.issue_date <= $${params.length}`; }
    if (customer_id) { params.push(customer_id); where += ` AND e.customer_id = $${params.length}`; }

    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;
    const { rows } = await pool.query(`
      SELECT e.id, e.estimate_number, e.title, e.issue_date,
             e.expiry_date, e.status_estimate, e.status_order,
             e.status_delivery, e.status_invoice, e.total,
             c.name AS customer_name
      FROM estimates e
      JOIN customers c ON c.id = e.customer_id
      WHERE ${where}
      ORDER BY e.id DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `, [...params, Number(limit), offset]);

    const { rows: totalRows } = await pool.query(`
      SELECT COUNT(*) AS total
      FROM estimates e
      JOIN customers c ON c.id = e.customer_id
      WHERE ${where}
    `, params);

    res.json({ estimates: rows, total: totalRows[0].total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function getEstimateById(req, res) {
  try {
    const { id } = req.params;
    const { rows: estimateRows } = await pool.query(`
      SELECT e.id, e.estimate_number, e.title, e.customer_id,
             e.issue_date, e.expiry_date,
             e.status_estimate, e.status_order, e.status_delivery, e.status_invoice,
             e.subtotal, e.tax_rate, e.tax_amount, e.total,
             e.notes, e.terms, e.created_at, e.updated_at,
             c.name AS customer_name, c.contact_name,
             c.postal_code, c.address, c.phone, c.email
      FROM estimates e
      JOIN customers c ON c.id = e.customer_id
      WHERE e.id = $1
    `, [id]);
    const estimate = estimateRows[0];
    if (!estimate) return res.status(404).json({ error: '見積書が見つかりません' });

    const { rows: items } = await pool.query(`
      SELECT id, line_number, item_id, category_name, item_name,
             description, quantity, unit, unit_price, amount
      FROM estimate_items
      WHERE estimate_id = $1
      ORDER BY line_number
    `, [id]);

    const { rows: invRows } = await pool.query(
      'SELECT id AS invoice_id, invoice_number FROM invoices WHERE estimate_id = $1', [id]
    );

    res.json({ ...estimate, items, invoice: invRows[0] || null });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function createEstimate(req, res) {
  try {
    const { customer_id, title, issue_date, expiry_date,
            tax_rate = 10, notes, terms, items = [] } = req.body;

    if (!customer_id) return res.status(400).json({ error: '顧客は必須です' });
    if (!issue_date)  return res.status(400).json({ error: '発行日は必須です' });
    if (!items.length) return res.status(400).json({ error: '明細が1行以上必要です' });

    const { subtotal, tax_amount, total } = calcTotals(items, tax_rate);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const estimate_number = await genEstimateNumber(client);
      const { rows } = await client.query(`
        INSERT INTO estimates
          (customer_id, estimate_number, title, issue_date, expiry_date,
           status_estimate, subtotal, tax_rate, tax_amount, total, notes, terms)
        VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [customer_id, estimate_number, title || null, issue_date,
          expiry_date || null, subtotal, tax_rate, tax_amount, total,
          notes || null, terms || null]);
      await upsertItems(client, rows[0].id, items);
      await client.query('COMMIT');
      res.status(201).json({ id: rows[0].id, estimate_number });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function updateEstimate(req, res) {
  try {
    const { id } = req.params;
    const { customer_id, title, issue_date, expiry_date,
            tax_rate = 10, notes, terms, items = [] } = req.body;

    if (!customer_id) return res.status(400).json({ error: '顧客は必須です' });
    if (!issue_date)  return res.status(400).json({ error: '発行日は必須です' });
    if (!items.length) return res.status(400).json({ error: '明細が1行以上必要です' });

    const { rows: existingRows } = await pool.query('SELECT id FROM estimates WHERE id = $1', [id]);
    if (!existingRows[0]) return res.status(404).json({ error: '見積書が見つかりません' });

    const { subtotal, tax_amount, total } = calcTotals(items, tax_rate);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        UPDATE estimates
        SET customer_id=$1, title=$2, issue_date=$3, expiry_date=$4,
            subtotal=$5, tax_rate=$6, tax_amount=$7, total=$8,
            notes=$9, terms=$10
        WHERE id=$11
      `, [customer_id, title || null, issue_date, expiry_date || null,
          subtotal, tax_rate, tax_amount, total,
          notes || null, terms || null, id]);
      await upsertItems(client, Number(id), items);
      await client.query('COMMIT');
      res.json({ id: Number(id) });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

const STATUS_KEYS = ['status_estimate', 'status_order', 'status_delivery', 'status_invoice'];

export async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { key, value } = req.body;
    if (!STATUS_KEYS.includes(key)) return res.status(400).json({ error: '無効なステータス項目です' });

    const { rows: existingRows } = await pool.query('SELECT id FROM estimates WHERE id = $1', [id]);
    if (!existingRows[0]) return res.status(404).json({ error: '見積書が見つかりません' });

    await pool.query(`UPDATE estimates SET ${key} = $1 WHERE id = $2`, [value ? 1 : 0, id]);
    res.json({ id: Number(id), key, value: !!value });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
