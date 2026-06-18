import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchEstimates } from '../../services/estimateService';
import FilterBar from '../../components/common/FilterBar';

const STATUS_FIELDS = [
  { key: 'status_estimate', label: '見積', style: { background: '#eff6ff', color: '#1d4ed8' } },
  { key: 'status_order',    label: '注文', style: { background: '#f0fdf4', color: '#15803d' } },
  { key: 'status_delivery', label: '納品', style: { background: '#fefce8', color: '#a16207' } },
  { key: 'status_invoice',  label: '請求', style: { background: '#fdf4ff', color: '#7e22ce' } },
];

const fmtDate = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : new Date(d).toISOString();
  return s.slice(0, 10);
};

export default function EstimateList() {
  const [estimates, setEstimates] = useState([]);
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
      const data = await fetchEstimates({ search, page, limit, ...filters });
      setEstimates(data.estimates);
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
        <h1 style={{ margin: 0, fontSize: '22px' }}>見積書一覧</h1>
        <Link to="/estimates/new">
          <button style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            + 新規作成
          </button>
        </Link>
      </div>

      <input
        type="text"
        placeholder="見積番号・件名・顧客名で検索"
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
                {['見積番号', '顧客名', '件名', '発行日', 'ステータス', '合計（税込）', '操作'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estimates.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>見積書がありません</td></tr>
              ) : (
                estimates.map((e) => {
                  const activeStatuses = STATUS_FIELDS.filter((f) => e[f.key]);
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                        <Link to={`/estimates/${e.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>
                          {e.estimate_number}
                        </Link>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{e.customer_name}</td>
                      <td style={{ padding: '10px 12px' }}>{e.title ?? '—'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{fmtDate(e.issue_date)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {activeStatuses.length === 0 ? (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>—</span>
                          ) : (
                            activeStatuses.map((f) => (
                              <span key={f.key} style={{ ...f.style, padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500' }}>
                                {f.label}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '500' }}>
                        ¥{Number(e.total).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <Link to={`/estimates/${e.id}`} style={{ color: '#2563eb', marginRight: '12px', textDecoration: 'none' }}>詳細</Link>
                        <Link to={`/estimates/${e.id}/edit`} style={{ color: '#6b7280', textDecoration: 'none' }}>編集</Link>
                      </td>
                    </tr>
                  );
                })
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
