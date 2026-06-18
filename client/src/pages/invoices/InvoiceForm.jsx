import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchInvoiceById, updateInvoice } from '../../services/invoiceService';

const newLine = () => ({
  estimate_item_id: null,
  category_name: '',
  item_name: '',
  description: '',
  quantity: 1,
  unit: '',
  unit_price: 0,
  amount: 0,
});

const inputSm = {
  padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px',
  fontSize: '13px', boxSizing: 'border-box', width: '100%',
};
const labelSt = {
  display: 'block', marginBottom: '3px', fontSize: '12px',
  fontWeight: '600', color: '#374151',
};

export default function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [form, setForm] = useState({ title: '', issue_date: '', due_date: '', notes: '' });
  const [lines, setLines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoiceById(id)
      .then((data) => {
        setInvoice(data);
        setForm({
          title:      data.title      ?? '',
          issue_date: (data.issue_date ?? '').slice(0, 10),
          due_date:   (data.due_date   ?? '').slice(0, 10),
          notes:      data.notes      ?? '',
        });
        setLines(
          data.items.map((it) => ({
            estimate_item_id: it.estimate_item_id,
            category_name: it.category_name ?? '',
            item_name:     it.item_name     ?? '',
            description:   it.description  ?? '',
            quantity:      Number(it.quantity),
            unit:          it.unit          ?? '',
            unit_price:    Number(it.unit_price),
            amount:        Number(it.amount),
          }))
        );
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // ─── line handlers ──────────────────────────────────────────────────────────

  const handleLineChange = (idx, key, value) => {
    setLines((ls) =>
      ls.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [key]: value };
        if (key === 'quantity' || key === 'unit_price') {
          const q = key === 'quantity' ? value : l.quantity;
          const p = key === 'unit_price' ? value : l.unit_price;
          updated.amount = Math.round((Number(q) || 0) * (Number(p) || 0));
        }
        return updated;
      })
    );
  };

  const addLine = () => setLines((ls) => [...ls, newLine()]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  // ─── 計算 ───────────────────────────────────────────────────────────────────

  const subtotal   = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const taxRate    = invoice?.tax_rate ?? 10;
  const taxAmount  = Math.floor(subtotal * Number(taxRate) / 100);
  const totalAmt   = subtotal + taxAmount;

  // ─── submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.item_name.trim());
    if (!validLines.length) { setError('明細を1行以上入力してください'); return; }
    setSubmitting(true);
    setError('');
    try {
      await updateInvoice(id, { ...form, items: validLines });
      navigate(`/invoices/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!invoice && !error) return <div style={{ padding: '24px' }}>読み込み中...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* パンくず */}
      <div style={{ marginBottom: '8px' }}>
        <Link to={`/invoices/${id}`} style={{ color: '#6b7280', textDecoration: 'none', fontSize: '13px' }}>
          ← {invoice?.invoice_number ?? '請求書詳細'}
        </Link>
      </div>

      <h1 style={{ fontSize: '22px', marginBottom: '20px' }}>
        請求書編集 — {invoice?.invoice_number}
      </h1>

      {error && (
        <p style={{ color: '#dc2626', background: '#fef2f2', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── ヘッダー ── */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          {/* 顧客・見積番号（読み取り専用） */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', padding: '12px', background: '#eff6ff', borderRadius: '6px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>顧客</span>
              <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: '600' }}>{invoice?.customer_name}</p>
            </div>
            <div>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>元見積番号</span>
              <p style={{ margin: '2px 0 0' }}>
                <Link to={`/estimates/${invoice?.estimate_id}`}
                  style={{ fontSize: '14px', color: '#2563eb', fontFamily: 'monospace', textDecoration: 'none' }}>
                  {invoice?.estimate_number}
                </Link>
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* 件名 */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelSt}>件名</label>
              <input type="text" value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例：Webサイト制作 請求"
                style={inputSm} />
            </div>
            {/* 請求日 */}
            <div>
              <label style={labelSt}>請求日 <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" value={form.issue_date} required
                onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                style={inputSm} />
            </div>
            {/* 支払期限 */}
            <div>
              <label style={labelSt}>支払期限</label>
              <input type="date" value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                style={inputSm} />
            </div>
            {/* 消費税率（読み取り専用） */}
            <div>
              <label style={labelSt}>消費税率（変更不可）</label>
              <input type="text" value={`${invoice?.tax_rate ?? 10}%`} readOnly
                style={{ ...inputSm, background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }} />
            </div>
          </div>
        </div>

        {/* ── 明細 ── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>明細</h2>
            <button type="button" onClick={addLine}
              style={{ padding: '6px 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>
              + 行を追加
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  {['大項目', '品目名 *', '説明', '数量', '単位', '単価（円）', '金額（円）', ''].map((h) => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: '600', color: '#374151' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 6px' }}>
                      <input value={line.category_name}
                        onChange={(e) => handleLineChange(idx, 'category_name', e.target.value)}
                        style={{ ...inputSm, width: '110px' }} placeholder="大項目" />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input value={line.item_name}
                        onChange={(e) => handleLineChange(idx, 'item_name', e.target.value)}
                        style={{ ...inputSm, width: '150px' }} placeholder="品目名" />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        style={{ ...inputSm, width: '170px' }} placeholder="説明" />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input type="number" min="0" step="0.01" value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                        style={{ ...inputSm, width: '70px', textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input value={line.unit}
                        onChange={(e) => handleLineChange(idx, 'unit', e.target.value)}
                        style={{ ...inputSm, width: '55px' }} placeholder="式" />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input type="number" min="0" step="1" value={line.unit_price}
                        onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                        style={{ ...inputSm, width: '110px', textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      ¥{Number(line.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                      <button type="button" onClick={() => removeLine(idx)}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px' }}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 合計 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <table style={{ fontSize: '14px', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['小計', `¥${subtotal.toLocaleString()}`],
                  [`消費税（${taxRate}%）`, `¥${taxAmount.toLocaleString()}`],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ padding: '4px 16px 4px 0', color: '#6b7280' }}>{label}</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', width: '120px' }}>{val}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #374151' }}>
                  <td style={{ padding: '8px 16px 4px 0', fontWeight: '700', fontSize: '16px' }}>合計（税込）</td>
                  <td style={{ padding: '8px 0 4px', textAlign: 'right', fontWeight: '700', fontSize: '16px' }}>
                    ¥{totalAmt.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 備考 ── */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelSt}>備考</label>
          <textarea value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={4} style={{ ...inputSm, resize: 'vertical' }} />
        </div>

        {/* ── ボタン ── */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" disabled={submitting}
            style={{ padding: '10px 32px', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? '保存中...' : '更新する'}
          </button>
          <button type="button" onClick={() => navigate(`/invoices/${id}`)}
            style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
