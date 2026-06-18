import pool from '../config/database.js';
import { isValidDateStr, isValidId } from '../utils/validation.js';

async function genInvoiceNumber(conn) {
  const year = new Date().getFullYear();
  const [[{ maxNum }]] = await conn.query(
    "SELECT MAX(CAST(SUBSTRING_INDEX(invoice_number, '-', -1) AS UNSIGNED)) AS maxNum FROM invoices WHERE invoice_number LIKE ?",
    [`INV-${year}-%`]
  );
  const seq = String((maxNum || 0) + 1).padStart(4, '0');
  return `INV-${year}-${seq}`;
}

export async function getInvoices(req, res) {
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

    let where = '(inv.invoice_number LIKE ? OR inv.title LIKE ? OR c.name LIKE ?)';
    const params = [like, like, like];
    if (date_from) { where += ' AND inv.issue_date >= ?'; params.push(date_from); }
    if (date_to)   { where += ' AND inv.issue_date <= ?'; params.push(date_to); }
    if (customer_id) { where += ' AND inv.customer_id = ?'; params.push(customer_id); }

    const [rows] = await pool.query(`
      SELECT inv.id, inv.invoice_number, inv.title,
             inv.issue_date, inv.due_date, inv.total,
             inv.payment_status, inv.paid_date,
             inv.estimate_id, e.estimate_number,
             c.name AS customer_name
      FROM invoices inv
      JOIN customers c  ON c.id  = inv.customer_id
      JOIN estimates e  ON e.id  = inv.estimate_id
      WHERE ${where}
      ORDER BY inv.id DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM invoices inv
      JOIN customers c ON c.id = inv.customer_id
      WHERE ${where}
    `, params);

    res.json({ invoices: rows, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function getInvoiceById(req, res) {
  try {
    const { id } = req.params;
    const [[invoice]] = await pool.query(`
      SELECT inv.id, inv.invoice_number, inv.title,
             inv.customer_id, inv.estimate_id,
             inv.issue_date, inv.due_date,
             inv.subtotal, inv.tax_rate, inv.tax_amount, inv.total,
             inv.payment_status, inv.paid_date,
             inv.notes, inv.created_at, inv.updated_at,
             c.name AS customer_name, c.contact_name,
             c.postal_code, c.address, c.phone, c.email,
             e.estimate_number
      FROM invoices inv
      JOIN customers c ON c.id  = inv.customer_id
      JOIN estimates e ON e.id  = inv.estimate_id
      WHERE inv.id = ?
    `, [id]);
    if (!invoice) return res.status(404).json({ error: '請求書が見つかりません' });

    const [items] = await pool.query(`
      SELECT id, line_number, estimate_item_id,
             category_name, item_name, description,
             quantity, unit, unit_price, amount
      FROM invoice_items
      WHERE invoice_id = ?
      ORDER BY line_number
    `, [id]);

    res.json({ ...invoice, items });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function createFromEstimate(req, res) {
  try {
    const { estimate_id, issue_date, due_date } = req.body;
    if (!estimate_id) return res.status(400).json({ error: '見積書IDは必須です' });

    // 見積書と明細を取得
    const [[estimate]] = await pool.query(
      'SELECT * FROM estimates WHERE id = ?', [estimate_id]
    );
    if (!estimate) return res.status(404).json({ error: '見積書が見つかりません' });

    // 二重請求チェック（事前）
    const [[dup]] = await pool.query(
      'SELECT id FROM invoices WHERE estimate_id = ?', [estimate_id]
    );
    if (dup) {
      return res.status(409).json({
        error: 'この見積書の請求書は既に作成されています',
        invoice_id: dup.id,
      });
    }

    const [estimateItems] = await pool.query(
      'SELECT * FROM estimate_items WHERE estimate_id = ? ORDER BY line_number',
      [estimate_id]
    );

    const today = new Date().toISOString().slice(0, 10);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const invoice_number = await genInvoiceNumber(conn);

      const [result] = await conn.query(`
        INSERT INTO invoices
          (estimate_id, customer_id, invoice_number, title,
           issue_date, due_date,
           subtotal, tax_rate, tax_amount, total, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        estimate_id, estimate.customer_id, invoice_number,
        estimate.title || null,
        issue_date || today,
        due_date || null,
        estimate.subtotal, estimate.tax_rate, estimate.tax_amount, estimate.total,
        estimate.notes || null,
      ]);

      const invoiceId = result.insertId;

      for (const item of estimateItems) {
        await conn.query(`
          INSERT INTO invoice_items
            (invoice_id, estimate_item_id, line_number, category_name, item_name,
             description, quantity, unit, unit_price, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          invoiceId, item.id, item.line_number,
          item.category_name, item.item_name, item.description,
          item.quantity, item.unit, item.unit_price, item.amount,
        ]);
      }

      // 見積書の請求ステータスフラグをONに（他のフラグは保持）
      await conn.query('UPDATE estimates SET status_invoice = 1 WHERE id = ?', [estimate_id]);

      await conn.commit();
      res.status(201).json({ id: invoiceId, invoice_number });
    } catch (e) {
      await conn.rollback();
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'この見積書の請求書は既に作成されています' });
      }
      throw e;
    } finally {
      conn.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function updatePaymentStatus(req, res) {
  try {
    const { id } = req.params;
    const { payment_status, paid_date } = req.body;

    if (![0, 1].includes(Number(payment_status))) {
      return res.status(400).json({ error: 'payment_statusは0または1を指定してください' });
    }
    if (paid_date && !isValidDateStr(paid_date)) {
      return res.status(400).json({ error: 'paid_dateの形式が正しくありません（YYYY-MM-DD）' });
    }

    const [[existing]] = await pool.query('SELECT id FROM invoices WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: '請求書が見つかりません' });

    await pool.query(
      'UPDATE invoices SET payment_status=?, paid_date=? WHERE id=?',
      [Number(payment_status), paid_date || null, id]
    );

    res.json({ id: Number(id), payment_status: Number(payment_status), paid_date: paid_date || null });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function updateInvoice(req, res) {
  try {
    const { id } = req.params;
    const { title, issue_date, due_date, notes, items = [] } = req.body;

    if (!issue_date) return res.status(400).json({ error: '請求日は必須です' });
    if (!items.length) return res.status(400).json({ error: '明細が1行以上必要です' });

    const [[existing]] = await pool.query(
      'SELECT id, tax_rate FROM invoices WHERE id = ?', [id]
    );
    if (!existing) return res.status(404).json({ error: '請求書が見つかりません' });

    const subtotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const tax_amount = Math.floor(subtotal * Number(existing.tax_rate) / 100);
    const total = subtotal + tax_amount;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(`
        UPDATE invoices
        SET title=?, issue_date=?, due_date=?,
            subtotal=?, tax_amount=?, total=?, notes=?
        WHERE id=?
      `, [title || null, issue_date, due_date || null,
          subtotal, tax_amount, total, notes || null, id]);

      await conn.query('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await conn.query(`
          INSERT INTO invoice_items
            (invoice_id, estimate_item_id, line_number, category_name, item_name,
             description, quantity, unit, unit_price, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          Number(id), it.estimate_item_id || null, i + 1,
          it.category_name || null, it.item_name || '',
          it.description || null, Number(it.quantity) || 1,
          it.unit || null, Number(it.unit_price) || 0,
          Number(it.amount) || 0,
        ]);
      }

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
