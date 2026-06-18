import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchCustomers, deleteCustomer } from '../../services/customerService';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCustomers({ search, page, limit });
      setCustomers(data.customers);
      setTotal(data.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / limit);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    try {
      await deleteCustomer(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>顧客一覧</h1>
        <Link to="/customers/new">
          <button style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            + 新規登録
          </button>
        </Link>
      </div>

      <input
        type="text"
        placeholder="顧客名・担当者名で検索"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        style={{ width: '100%', padding: '8px 12px', marginBottom: '16px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
      />

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                {['顧客名', '担当者名', '電話番号', 'メール', '操作'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>顧客がいません</td></tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 12px' }}>{c.name}</td>
                    <td style={{ padding: '10px 12px' }}>{c.contact_name ?? '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{c.phone ?? '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{c.email ?? '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Link to={`/customers/${c.id}/edit`} style={{ color: '#2563eb', marginRight: '12px', textDecoration: 'none' }}>編集</Link>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '14px' }}
                      >
                        削除
                      </button>
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
