import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchCategoryById } from '../../services/itemCategoryService';
import { fetchItems, deleteItem, moveItemSort } from '../../services/itemService';

export default function ItemList() {
  const { categoryId } = useParams();
  const [category, setCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cat, itms] = await Promise.all([
        fetchCategoryById(categoryId),
        fetchItems(categoryId),
      ]);
      setCategory(cat);
      setItems(itms);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    try {
      await deleteItem(categoryId, id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleMove = async (id, direction) => {
    try {
      setItems(await moveItemSort(categoryId, id, direction));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '8px' }}>
        <Link to="/item-categories" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '13px' }}>
          ← 大項目一覧
        </Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>
          {category?.name ?? '...'} の小項目
        </h1>
        <Link to={`/item-categories/${categoryId}/items/new`}>
          <button style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            + 新規登録
          </button>
        </Link>
      </div>

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              {['順番', '小項目名', '単位', '単価（円）', '操作'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                  小項目がありません
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleMove(item.id, 'up')}
                        disabled={idx === 0}
                        style={{ padding: '2px 7px', border: '1px solid #d1d5db', borderRadius: '3px', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: '11px', background: '#fff', color: idx === 0 ? '#d1d5db' : '#374151' }}
                      >▲</button>
                      <button
                        onClick={() => handleMove(item.id, 'down')}
                        disabled={idx === items.length - 1}
                        style={{ padding: '2px 7px', border: '1px solid #d1d5db', borderRadius: '3px', cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer', fontSize: '11px', background: '#fff', color: idx === items.length - 1 ? '#d1d5db' : '#374151' }}
                      >▼</button>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: '500' }}>{item.name}</td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{item.unit ?? '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{Number(item.unit_price).toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Link to={`/item-categories/${categoryId}/items/${item.id}/edit`} style={{ color: '#2563eb', marginRight: '12px', textDecoration: 'none' }}>編集</Link>
                    <button
                      onClick={() => handleDelete(item.id, item.name)}
                      style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '14px' }}
                    >削除</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
