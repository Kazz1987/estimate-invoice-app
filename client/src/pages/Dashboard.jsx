import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboardSummary } from '../services/dashboardService';
import FilterBar from '../components/common/FilterBar';

const fmtDate = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : new Date(d).toISOString();
  return s.slice(0, 10);
};

const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  const due = new Date(typeof dueDate === 'string' ? dueDate.slice(0, 10) : dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
};

const cardLabelStyle = {
  margin: 0,
  fontSize: '13px',
  color: '#6b7280',
};

const cardValueStyle = {
  margin: '8px 0 0',
  fontSize: '28px',
  fontWeight: '700',
  color: '#1a1a1a',
};

function SummaryCard({ label, value, accent }) {
  return (
    <div style={cardStyle}>
      <p style={cardLabelStyle}>{label}</p>
      <p style={{ ...cardValueStyle, color: accent || cardValueStyle.color }}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ date_from: '', date_to: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDashboardSummary(filters);
      setSummary(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '22px', marginBottom: '16px' }}>ダッシュボード</h1>

      <FilterBar defaultPreset="thisMonth" onChange={setFilters} />

      {loading && <p style={{ color: '#6b7280' }}>読み込み中...</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {summary && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <SummaryCard
              label="期間内の請求合計金額"
              value={`¥${summary.monthlyInvoiceTotal.toLocaleString()}`}
              accent="#2563eb"
            />
            <SummaryCard
              label="未処理の見積件数"
              value={`${summary.pendingEstimateCount}件`}
            />
            <SummaryCard
              label="期間内に作成した見積件数"
              value={`${summary.monthlyEstimateCount}件`}
            />
          </div>

          <h2 style={{ fontSize: '16px', color: '#374151', marginBottom: '12px' }}>
            ステータス別件数
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '16px',
            }}
          >
            <SummaryCard label="見積" value={`${summary.statusCounts.estimate}件`} />
            <SummaryCard label="注文" value={`${summary.statusCounts.order}件`} />
            <SummaryCard label="納品" value={`${summary.statusCounts.delivery}件`} />
            <SummaryCard label="請求" value={`${summary.statusCounts.invoice}件`} />
          </div>

          <h2 style={{ fontSize: '16px', color: '#374151', marginTop: '24px', marginBottom: '12px' }}>
            未払い請求一覧（支払期日が近い順）
          </h2>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            {summary.unpaidInvoices.length === 0 ? (
              <p style={{ margin: 0, padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                未払いの請求書はありません
              </p>
            ) : (
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      {['請求番号', '顧客名', '請求日', '支払期日', '金額'].map((h) => (
                        <th key={h} style={{
                          padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb',
                          whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#f3f4f6',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.unpaidInvoices.map((inv) => {
                      const overdue = isOverdue(inv.due_date);
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                        >
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace', whiteSpace: 'nowrap', color: '#7e22ce' }}>
                            {inv.invoice_number}
                          </td>
                          <td style={{ padding: '10px 12px' }}>{inv.customer_name}</td>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmtDate(inv.issue_date)}</td>
                          <td style={{
                            padding: '10px 12px', whiteSpace: 'nowrap',
                            color: overdue ? '#dc2626' : 'inherit',
                            fontWeight: overdue ? '700' : 'normal',
                          }}>
                            {fmtDate(inv.due_date)}{overdue && ' （期限超過）'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '500' }}>
                            ¥{Number(inv.total).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
