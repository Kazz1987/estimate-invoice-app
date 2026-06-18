import pool from '../config/database.js';
import { isValidDateStr, isValidId } from '../utils/validation.js';

function calcTotals(items, taxRate) {
  const subtotal = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const tax_amount = Math.floor(subtotal * Number(taxRate) / 100);
  return { subtotal, tax_amount, total: subtotal + tax_amount };
}

async function genEstimateNumber(conn) {
  const year = new Date().getFullYear();
  const [[{ maxNum }]] = await conn.query(
    "SELECT MAX(CAST(SUBSTRING_INDEX(estimate_number, '-', -1) AS UNSIGNED)) AS maxNum FROM estimates WHERE estimate_number LIKE ?",
    [`EST-${year}-%`]
  );
  const seq = String((maxNum || 0) + 1).padStart(4, '0');
  return `EST-${year}-${seq}`;
}

async function upsertItems(conn, estimateId, items) {
  await conn.query('DELETE FROM estimate_items WHERE estimate_id = ?', [estimateId]);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    await conn.query(`
      INSERT INTO estimate_items
        (estimate_id, item_id, line_number, category_name, item_name,
         description, quantity, unit, unit_price, amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

    let where = '(e.estimate_number LIKE ? OR e.title LIKE ? OR c.name LIKE ?)';
    const params = [like, like, like];
    if (date_from) { where += ' AND e.issue_date >= ?'; params.push(date_from); }
    if (date_to)   { where += ' AND e.issue_date <= ?'; params.push(date_to); }
    if (customer_id) { where += ' AND e.customer_id = ?'; params.push(customer_id); }

    const [rows] = await pool.query(`
      SELECT e.id, e.estimate_number, e.title, e.issue_date,
             e.expiry_date, e.status_estimate, e.status_order,
             e.status_delivery, e.status_invoice, e.total,
             c.name AS customer_name
      FROM estimates e
      JOIN customers c ON c.id = e.customer_id
      WHERE ${where}
      ORDER BY e.id DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM estimates e
      JOIN customers c ON c.id = e.customer_id
      WHERE ${where}
    `, params);

    res.json({ estimates: rows, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function getEstimateById(req, res) {
  try {
    const { id } = req.params;
    const [[estimate]] = await pool.query(`
      SELECT e.id, e.estimate_number, e.title, e.customer_id,
             e.issue_date, e.expiry_date,
             e.status_estimate, e.status_order, e.status_delivery, e.status_invoice,
             e.subtotal, e.tax_rate, e.tax_amount, e.total,
             e.notes, e.terms, e.created_at, e.updated_at,
             c.name AS customer_name, c.contact_name,
             c.postal_code, c.address, c.phone, c.email
      FROM estimates e
      JOIN customers c ON c.id = e.customer_id
      WHERE e.id = ?
    `, [id]);
    if (!estimate) return res.status(404).json({ error: '見積書が見つかりません' });

    const [items] = await pool.query(`
      SELECT id, line_number, item_id, category_name, item_name,
             description, quantity, unit, unit_price, amount
      FROM estimate_items
      WHERE estimate_id = ?
      ORDER BY line_number
    `, [id]);

    const [[invRow]] = await pool.query(
      'SELECT id AS invoice_id, invoice_number FROM invoices WHERE estimate_id = ?', [id]
    );

    res.json({ ...estimate, items, invoice: invRow || null });
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
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const estimate_number = await genEstimateNumber(conn);
      const [result] = await conn.query(`
        INSERT INTO estimates
          (customer_id, estimate_number, title, issue_date, expiry_date,
           status_estimate, subtotal, tax_rate, tax_amount, total, notes, terms)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
      `, [customer_id, estimate_number, title || null, issue_date,
          expiry_date || null, subtotal, tax_rate, tax_amount, total,
          notes || null, terms || null]);
      await upsertItems(conn, result.insertId, items);
      await conn.commit();
      res.status(201).json({ id: result.insertId, estimate_number });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
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

    const [[existing]] = await pool.query('SELECT id FROM estimates WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: '見積書が見つかりません' });

    const { subtotal, tax_amount, total } = calcTotals(items, tax_rate);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`
        UPDATE estimates
        SET customer_id=?, title=?, issue_date=?, expiry_date=?,
            subtotal=?, tax_rate=?, tax_amount=?, total=?,
            notes=?, terms=?
        WHERE id=?
      `, [customer_id, title || null, issue_date, expiry_date || null,
          subtotal, tax_rate, tax_amount, total,
          notes || null, terms || null, id]);
      await upsertItems(conn, Number(id), items);
      await conn.commit();
      res.json({ id: Number(id) });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
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

    const [[existing]] = await pool.query('SELECT id FROM estimates WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: '見積書が見つかりません' });

    await pool.query(`UPDATE estimates SET ${key} = ? WHERE id = ?`, [value ? 1 : 0, id]);
    res.json({ id: Number(id), key, value: !!value });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
