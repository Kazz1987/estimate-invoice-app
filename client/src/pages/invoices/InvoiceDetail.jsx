import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchInvoiceById, updatePaymentStatus } from '../../services/invoiceService';

const fmtDate = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : new Date(d).toISOString();
  const [y, m, day] = s.slice(0, 10).split('-');
  return `${y}年${Number(m)}月${Number(day)}日`;
};

const toDateInputValue = (d) => {
  if (!d) return '';
  const s = typeof d === 'string' ? d : new Date(d).toISOString();
  return s.slice(0, 10);
};

function PaymentStatusPanel({ invoice, onUpdated }) {
  const paid = Number(invoice.payment_status) === 1;
  const [editing, setEditing] = useState(false);
  const [paidDate, setPaidDate] = useState(toDateInputValue(invoice.paid_date) || toDateInputValue(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (payment_status, paid_date) => {
    setSaving(true);
    setError('');
    try {
      await updatePaymentStatus(invoice.id, { payment_status, paid_date });
      onUpdated({ payment_status, paid_date });
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
      <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>入金状況</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: editing ? '12px' : 0, flexWrap: 'wrap' }}>
        <span style={{
          padding: '3px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '600',
          background: paid ? '#dcfce7' : '#fee2e2',
          color: paid ? '#15803d' : '#b91c1c',
          border: `1px solid ${paid ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {paid ? '入金済み' : '未払い'}
        </span>
        {paid && invoice.paid_date && (
          <span style={{ fontSize: '13px', color: '#374151' }}>入金日: {fmtDate(invoice.paid_date)}</span>
        )}

        {!editing && !paid && (
          <button onClick={() => setEditing(true)} disabled={saving}
            style={{ padding: '5px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            入金済みにする
          </button>
        )}
        {!editing && paid && (
          <button onClick={() => save(0, null)} disabled={saving}
            style={{ padding: '5px 14px', background: '#fff', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            未払いに戻す
          </button>
        )}
      </div>

      {editing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13px', color: '#6b7280' }}>入金日:</label>
          <input
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
          />
          <button onClick={() => save(1, paidDate)} disabled={saving || !paidDate}
            style={{ padding: '5px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            確定
          </button>
          <button onClick={() => setEditing(false)} disabled={saving}
            style={{ padding: '5px 14px', background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            キャンセル
          </button>
        </div>
      )}

      {error && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '8px', marginBottom: 0 }}>{error}</p>}
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoiceById(id)
      .then((data) => setInvoice(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '24px' }}>読み込み中...</div>;
  if (error)   return <div style={{ padding: '24px', color: '#dc2626' }}>{error}</div>;
  if (!invoice) return null;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* パンくず */}
      <div style={{ marginBottom: '12px' }}>
        <Link to="/invoices" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '13px' }}>
          ← 請求書一覧
        </Link>
      </div>

      {/* タイトル行 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontFamily: 'monospace' }}>
              {invoice.invoice_number}
            </h1>
            <span style={{ padding: '3px 10px', background: '#fdf4ff', color: '#7e22ce', border: '1px solid #e9d5ff', borderRadius: '9999px', fontSize: '12px', fontWeight: '600' }}>
              請求書
            </span>
          </div>
          <span style={{ fontSize: '15px', color: '#6b7280' }}>{invoice.title || '（件名なし）'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Link to={`/invoices/${id}/edit`}>
            <button style={{ padding: '6px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
              編集
            </button>
          </Link>
          <Link to={`/estimates/${invoice.estimate_id}`}>
            <button style={{ padding: '6px 16px', background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
              元見積: {invoice.estimate_number}
            </button>
          </Link>
          <button
            onClick={() => window.open(`http://localhost:3001/api/print/invoices/${id}/print`, '_blank')}
            style={{ padding: '6px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            🖨 印刷
          </button>
          <button
            onClick={() => window.open(`http://localhost:3001/api/print/invoices/${id}/pdf`, '_blank')}
            style={{ padding: '6px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            PDF出力
          </button>
        </div>
      </div>

      {/* ── 顧客・日付情報 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>請求先</p>
          <p style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: '700' }}>{invoice.customer_name}</p>
          {invoice.contact_name && (
            <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#374151' }}>{invoice.contact_name} 様</p>
          )}
          {invoice.address && (
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{invoice.address}</p>
          )}
        </div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <table style={{ fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['請求日',   fmtDate(invoice.issue_date)],
                ['支払期限', fmtDate(invoice.due_date)],
                ['消費税率', `${invoice.tax_rate}%`],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ padding: '3px 16px 3px 0', color: '#6b7280', whiteSpace: 'nowrap' }}>{label}</td>
                  <td style={{ padding: '3px 0', fontWeight: '500' }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 入金状況 ── */}
      <div style={{ marginBottom: '20px' }}>
        <PaymentStatusPanel
          invoice={invoice}
          onUpdated={(patch) => setInvoice((prev) => ({ ...prev, ...patch }))}
        />
      </div>

      {/* ── 明細 ── */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>明細</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              {['大項目', '品目名', '説明', '数量', '単位', '単価', '金額'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: '600', color: '#374151' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '9px 12px', color: '#6b7280' }}>{it.category_name || '—'}</td>
                <td style={{ padding: '9px 12px', fontWeight: '500' }}>{it.item_name}</td>
                <td style={{ padding: '9px 12px', color: '#6b7280' }}>{it.description || '—'}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right' }}>{Number(it.quantity)}</td>
                <td style={{ padding: '9px 12px', color: '#6b7280' }}>{it.unit || '—'}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right' }}>¥{Number(it.unit_price).toLocaleString()}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: '500' }}>¥{Number(it.amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 合計 ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <table style={{ fontSize: '14px', borderCollapse: 'collapse', minWidth: '240px' }}>
          <tbody>
            {[
              ['小計', `¥${Number(invoice.subtotal).toLocaleString()}`],
              [`消費税（${invoice.tax_rate}%）`, `¥${Number(invoice.tax_amount).toLocaleString()}`],
            ].map(([label, val]) => (
              <tr key={label}>
                <td style={{ padding: '5px 20px 5px 0', color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>{label}</td>
                <td style={{ padding: '5px 0', textAlign: 'right', borderTop: '1px solid #e5e7eb' }}>{val}</td>
              </tr>
            ))}
            <tr>
              <td style={{ padding: '8px 20px 8px 0', fontWeight: '700', fontSize: '16px', borderTop: '2px solid #374151' }}>合計（税込）</td>
              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '700', fontSize: '18px', borderTop: '2px solid #374151' }}>
                ¥{Number(invoice.total).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 備考 ── */}
      {invoice.notes && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>備考</p>
          <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
