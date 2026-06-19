import { Router } from 'express';
import pool from '../config/database.js';
import { buildDocumentHtml } from '../templates/documentTemplate.js';
import { htmlToPdf } from '../utils/pdfGenerator.js';

const router = Router();

// ─── データ取得ヘルパー ───────────────────────────────────────────────────────

async function fetchCompanySettings() {
  const { rows } = await pool.query(
    `SELECT company_name, postal_code, address, phone, fax, email, invoice_registration_number
     FROM company_settings ORDER BY id LIMIT 1`
  );
  return rows[0] || null;
}

async function fetchEstimate(id) {
  const { rows: docRows } = await pool.query(`
    SELECT e.id, e.estimate_number, e.title,
           e.issue_date, e.expiry_date,
           e.status_estimate, e.status_order, e.status_delivery, e.status_invoice,
           e.subtotal, e.tax_rate, e.tax_amount, e.total,
           e.notes, e.terms,
           c.name AS customer_name, c.contact_name, c.address
    FROM estimates e
    JOIN customers c ON c.id = e.customer_id
    WHERE e.id = $1
  `, [id]);
  const doc = docRows[0];
  if (!doc) return null;

  const { rows: items } = await pool.query(`
    SELECT category_name, item_name, description,
           quantity, unit, unit_price, amount
    FROM estimate_items WHERE estimate_id = $1 ORDER BY line_number
  `, [id]);

  return { ...doc, items };
}

async function fetchInvoice(id) {
  const { rows: docRows } = await pool.query(`
    SELECT inv.id, inv.invoice_number, inv.title,
           inv.issue_date, inv.due_date,
           inv.subtotal, inv.tax_rate, inv.tax_amount, inv.total,
           inv.notes,
           c.name AS customer_name, c.contact_name, c.address
    FROM invoices inv
    JOIN customers c ON c.id = inv.customer_id
    WHERE inv.id = $1
  `, [id]);
  const doc = docRows[0];
  if (!doc) return null;

  const { rows: items } = await pool.query(`
    SELECT category_name, item_name, description,
           quantity, unit, unit_price, amount
    FROM invoice_items WHERE invoice_id = $1 ORDER BY line_number
  `, [id]);

  return { ...doc, items };
}

// ─── 見積書 ──────────────────────────────────────────────────────────────────

router.get('/estimates/:id/print', async (req, res) => {
  try {
    const doc = await fetchEstimate(req.params.id);
    if (!doc) return res.status(404).send('見積書が見つかりません');
    const company = await fetchCompanySettings();
    const html = buildDocumentHtml(doc, 'estimate', company);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

router.get('/estimates/:id/pdf', async (req, res) => {
  try {
    const doc = await fetchEstimate(req.params.id);
    if (!doc) return res.status(404).json({ error: '見積書が見つかりません' });
    const company = await fetchCompanySettings();
    const html = buildDocumentHtml(doc, 'estimate', company);
    const pdf = await htmlToPdf(html);
    const filename = `${doc.estimate_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

// ─── 請求書 ──────────────────────────────────────────────────────────────────

router.get('/invoices/:id/print', async (req, res) => {
  try {
    const doc = await fetchInvoice(req.params.id);
    if (!doc) return res.status(404).send('請求書が見つかりません');
    const company = await fetchCompanySettings();
    const html = buildDocumentHtml(doc, 'invoice', company);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

router.get('/invoices/:id/pdf', async (req, res) => {
  try {
    const doc = await fetchInvoice(req.params.id);
    if (!doc) return res.status(404).json({ error: '請求書が見つかりません' });
    const company = await fetchCompanySettings();
    const html = buildDocumentHtml(doc, 'invoice', company);
    const pdf = await htmlToPdf(html);
    const filename = `${doc.invoice_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
});

export default router;
