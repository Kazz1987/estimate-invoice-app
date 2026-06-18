import pool from '../config/database.js';
import { isValidDateStr } from '../utils/validation.js';

export async function getDashboardSummary(req, res) {
  try {
    const { date_from, date_to } = req.query;

    if (date_from && !isValidDateStr(date_from)) {
      return res.status(400).json({ error: 'date_fromの形式が正しくありません（YYYY-MM-DD）' });
    }
    if (date_to && !isValidDateStr(date_to)) {
      return res.status(400).json({ error: 'date_toの形式が正しくありません（YYYY-MM-DD）' });
    }

    let invoiceWhere = '1=1';
    const invoiceParams = [];
    if (date_from) { invoiceWhere += ' AND issue_date >= ?'; invoiceParams.push(date_from); }
    if (date_to)   { invoiceWhere += ' AND issue_date <= ?'; invoiceParams.push(date_to); }

    let estimateWhere = '1=1';
    const estimateParams = [];
    if (date_from) { estimateWhere += ' AND issue_date >= ?'; estimateParams.push(date_from); }
    if (date_to)   { estimateWhere += ' AND issue_date <= ?'; estimateParams.push(date_to); }

    const [[{ invoiceTotal }]] = await pool.query(`
      SELECT COALESCE(SUM(total), 0) AS invoiceTotal
      FROM invoices
      WHERE ${invoiceWhere}
    `, invoiceParams);

    const [[{ pendingEstimateCount }]] = await pool.query(`
      SELECT COUNT(*) AS pendingEstimateCount
      FROM estimates
      WHERE ${estimateWhere}
        AND status_estimate = 1 AND status_order = 0 AND status_delivery = 0 AND status_invoice = 0
    `, estimateParams);

    const [[{ estimateCount }]] = await pool.query(`
      SELECT COUNT(*) AS estimateCount
      FROM estimates
      WHERE ${estimateWhere}
    `, estimateParams);

    const [[statusCounts]] = await pool.query(`
      SELECT
        SUM(status_estimate) AS estimate,
        SUM(status_order) AS order_,
        SUM(status_delivery) AS delivery,
        SUM(status_invoice) AS invoice
      FROM estimates
      WHERE ${estimateWhere}
    `, estimateParams);

    const [unpaidInvoices] = await pool.query(`
      SELECT inv.id, inv.invoice_number, inv.issue_date, inv.due_date, inv.total,
             c.name AS customer_name
      FROM invoices inv
      JOIN customers c ON c.id = inv.customer_id
      WHERE inv.payment_status = 0
      ORDER BY inv.due_date IS NULL, inv.due_date ASC
    `);

    res.json({
      monthlyInvoiceTotal: Number(invoiceTotal),
      pendingEstimateCount: Number(pendingEstimateCount),
      monthlyEstimateCount: Number(estimateCount),
      statusCounts: {
        estimate: Number(statusCounts.estimate) || 0,
        order: Number(statusCounts.order_) || 0,
        delivery: Number(statusCounts.delivery) || 0,
        invoice: Number(statusCounts.invoice) || 0,
      },
      unpaidInvoices,
    });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
