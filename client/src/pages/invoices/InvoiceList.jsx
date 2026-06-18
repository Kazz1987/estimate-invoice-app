import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchInvoices } from '../../services/invoiceService';
import FilterBar from '../../components/common/FilterBar';

const fmtDate = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : new Date(d).toISOString();
  return s.slice(0, 10);
};

function PaymentStatusBadge({ paymentStatus }) {
  const paid = Number(paymentStatus) === 1;
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
      background: paid ? '#dcfce7' : '#fee2e2',
      color: paid ? '#15803d' : '#b91c1c',
      border: `1px solid ${paid ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {paid ? '入金済み' : '未払い'}
    </span>
  );
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ date_from: '', date_to: '', customer_id: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchInvoices({ search, page, limit, ...filters });
      setInvoices(data.invoices);
      setTotal(data.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, page, filters]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>請求書一覧</h1>
      </div>

      <input
        type="text"
        placeholder="請求番号・件名・顧客名で検索"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        style={{ width: '100%', padding: '8px 12px', marginBottom: '16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
      />

      <FilterBar
        showCustomerFilter
        onChange={(f) => { setFilters(f); setPage(1); }}
      />

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {loading ? <p>読み込み中...</p> : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                {['請求番号', '顧客名', '件名', '請求日', '支払期限', '合計（税込）', '入金状況', '操作'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    請求書がありません
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      <Link to={`/invoices/${inv.id}`} style={{ color: '#7e22ce', textDecoration: 'none', fontWeight: '500' }}>
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{inv.customer_name}</td>
                    <td style={{ padding: '10px 12px' }}>{inv.title ?? '—'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmtDate(inv.issue_date)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmtDate(inv.due_date)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '500' }}>
                      ¥{Number(inv.total).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <PaymentStatusBadge paymentStatus={inv.payment_status} />
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <Link to={`/invoices/${inv.id}`} style={{ color: '#7e22ce', marginRight: '12px', textDecoration: 'none' }}>詳細</Link>
                      <Link to={`/invoices/${inv.id}/edit`} style={{ color: '#6b7280', marginRight: '12px', textDecoration: 'none' }}>編集</Link>
                      <Link to={`/estimates/${inv.estimate_id}`} style={{ color: '#6b7280', textDecoration: 'none', fontSize: '12px' }}>
                        元見積: {inv.estimate_number}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
            <span>全 {total} 件</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>前へ</button>
              <span>{page} / {totalPages || 1}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>次へ</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
