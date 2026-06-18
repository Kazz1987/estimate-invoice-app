import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchEstimateById, updateEstimateStatus } from '../../services/estimateService';
import { createInvoice } from '../../services/invoiceService';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : new Date(d).toISOString();
  const [y, m, day] = s.slice(0, 10).split('-');
  return `${y}年${Number(m)}月${Number(day)}日`;
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const STATUS_FIELDS = [
  { key: 'status_estimate', label: '見積', style: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' } },
  { key: 'status_order',    label: '注文', style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' } },
  { key: 'status_delivery', label: '納品', style: { background: '#fefce8', color: '#a16207', border: '1px solid #fde68a' } },
  { key: 'status_invoice',  label: '請求', style: { background: '#fdf4ff', color: '#7e22ce', border: '1px solid #e9d5ff' } },
];

// ─── component ────────────────────────────────────────────────────────────────

export default function EstimateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // 請求書作成モーダル
  const [modalOpen, setModalOpen] = useState(false);
  const [invIssueDate, setInvIssueDate] = useState(() => todayStr());
  const [invDueDate, setInvDueDate] = useState(() => addDays(30));
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = () => {
    setLoading(true);
    fetchEstimateById(id)
      .then((data) => setEstimate(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusToggle = async (key, value) => {
    setStatusUpdating(true);
    try {
      await updateEstimateStatus(id, key, value);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const openModal = () => {
    setModalError('');
    setModalOpen(true);
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setCreating(true);
    setModalError('');
    try {
      const { id: invoiceId } = await createInvoice({
        estimate_id: estimate.id,
        issue_date: invIssueDate,
        due_date: invDueDate || null,
      });
      navigate(`/invoices/${invoiceId}`);
    } catch (err) {
      if (err.invoice_id) {
        navigate(`/invoices/${err.invoice_id}`);
      } else {
        setModalError(err.message);
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div style={{ padding: '24px' }}>読み込み中...</div>;
  if (error)   return <div style={{ padding: '24px', color: '#dc2626' }}>{error}</div>;
  if (!estimate) return null;

  const activeStatuses = STATUS_FIELDS.filter((f) => estimate[f.key]);

  return (
    <>
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* パンくず */}
      <div style={{ marginBottom: '12px' }}>
        <Link to="/estimates" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '13px' }}>
          ← 見積書一覧
        </Link>
      </div>

      {/* タイトル行 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontFamily: 'monospace' }}>
            {estimate.estimate_number}
          </h1>
          <span style={{ fontSize: '15px', color: '#6b7280' }}>{estimate.title || '（件名なし）'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {activeStatuses.length === 0 ? (
            <span style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', padding: '4px 14px', borderRadius: '9999px', fontSize: '14px', fontWeight: '600' }}>
              未設定
            </span>
          ) : (
            activeStatuses.map((f) => (
              <span key={f.key} style={{ ...f.style, padding: '4px 14px', borderRadius: '9999px', fontSize: '14px', fontWeight: '600' }}>
                {f.label}
              </span>
            ))
          )}
          <Link to={`/estimates/${id}/edit`}>
            <button style={{ padding: '6px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
              編集
            </button>
          </Link>
          <button
            onClick={() => window.open(`http://localhost:3001/api/print/estimates/${id}/print`, '_blank')}
            style={{ padding: '6px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
          >
            🖨 印刷
          </button>
          <button
            onClick={() => window.open(`http://localhost:3001/api/print/estimates/${id}/pdf`, '_blank')}
            style={{ padding: '6px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            PDF出力
          </button>
        </div>
      </div>

      {/* ── 顧客・日付情報 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>顧客</p>
          <p style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: '700' }}>{estimate.customer_name}</p>
          {estimate.contact_name && <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#374151' }}>{estimate.contact_name} 様</p>}
          {estimate.address && <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{estimate.address}</p>}
        </div>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <table style={{ fontSize: '13px', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['発行日',   fmtDate(estimate.issue_date)],
                ['有効期限', fmtDate(estimate.expiry_date)],
                ['消費税率', `${estimate.tax_rate}%`],
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
            {estimate.items.map((it) => (
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
              ['小計', `¥${Number(estimate.subtotal).toLocaleString()}`],
              [`消費税（${estimate.tax_rate}%）`, `¥${Number(estimate.tax_amount).toLocaleString()}`],
            ].map(([label, val]) => (
              <tr key={label}>
                <td style={{ padding: '5px 20px 5px 0', color: '#6b7280', borderTop: '1px solid #e5e7eb' }}>{label}</td>
                <td style={{ padding: '5px 0', textAlign: 'right', borderTop: '1px solid #e5e7eb' }}>{val}</td>
              </tr>
            ))}
            <tr>
              <td style={{ padding: '8px 20px 8px 0', fontWeight: '700', fontSize: '16px', borderTop: '2px solid #374151' }}>合計（税込）</td>
              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: '700', fontSize: '18px', borderTop: '2px solid #374151' }}>
                ¥{Number(estimate.total).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── 備考・取引条件 ── */}
      {(estimate.notes || estimate.terms) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          {estimate.notes && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>備考</p>
              <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{estimate.notes}</p>
            </div>
          )}
          {estimate.terms && (
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>取引条件</p>
              <p style={{ margin: 0, fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{estimate.terms}</p>
            </div>
          )}
        </div>
      )}

      {/* ── ステータス変更 ── */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>ステータス変更</p>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {STATUS_FIELDS.map((f) => {
            const checked = !!estimate[f.key];
            return (
              <label
                key={f.key}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: statusUpdating ? 'not-allowed' : 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={statusUpdating}
                  onChange={(e) => handleStatusToggle(f.key, e.target.checked)}
                />
                {f.label}
              </label>
            );
          })}
        </div>
      </div>

      {/* ── 請求書セクション ── */}
      <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '16px' }}>
        <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>請求書</p>
        {estimate.invoice ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>作成済み：</span>
            <Link to={`/invoices/${estimate.invoice.invoice_id}`}
              style={{ color: '#7e22ce', textDecoration: 'none', fontWeight: '600', fontFamily: 'monospace', fontSize: '15px' }}>
              {estimate.invoice.invoice_number} →
            </Link>
          </div>
        ) : (
          <button
            onClick={openModal}
            style={{ padding: '8px 20px', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            請求書を作成
          </button>
        )}
      </div>

    </div>
      {modalOpen && createPortal(
        <div
          style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={(e) => { if (e.target === e.currentTarget && !creating) setModalOpen(false); }}
        >
          <div style={{ background: '#fff', borderRadius: '10px', padding: '28px', width: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '18px' }}>請求書を作成</h2>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
              見積書 <strong style={{ color: '#374151' }}>{estimate.estimate_number}</strong> から請求書を作成します。
            </p>
            {modalError && (
              <p style={{ color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
                {modalError}
              </p>
            )}
            <form onSubmit={handleCreateInvoice}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  請求日 <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date" value={invIssueDate} required
                  onChange={(e) => setInvIssueDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                  支払期限
                </label>
                <input
                  type="date" value={invDueDate}
                  onChange={(e) => setInvDueDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={creating}
                  style={{ flex: 1, padding: '10px', background: '#7e22ce', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: creating ? 'not-allowed' : 'pointer' }}>
                  {creating ? '作成中...' : '請求書を作成する'}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} disabled={creating}
                  style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

