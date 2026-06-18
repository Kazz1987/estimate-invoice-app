import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories, deleteCategory, moveCategorySort } from '../../services/itemCategoryService';

export default function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await fetchCategories());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`「${name}」を削除しますか？`)) return;
    try {
      await deleteCategory(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleMove = async (id, direction) => {
    try {
      setCategories(await moveCategorySort(id, direction));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>品目マスタ（大項目）</h1>
        <Link to="/item-categories/new">
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
              {['順番', '大項目名', '小項目数', '操作'].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                  大項目がありません
                </td>
              </tr>
            ) : (
              categories.map((cat, idx) => (
                <tr key={cat.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleMove(cat.id, 'up')}
                        disabled={idx === 0}
                        style={{ padding: '2px 7px', border: '1px solid #d1d5db', borderRadius: '3px', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: '11px', background: '#fff', color: idx === 0 ? '#d1d5db' : '#374151' }}
                      >▲</button>
                      <button
                        onClick={() => handleMove(cat.id, 'down')}
                        disabled={idx === categories.length - 1}
                        style={{ padding: '2px 7px', border: '1px solid #d1d5db', borderRadius: '3px', cursor: idx === categories.length - 1 ? 'not-allowed' : 'pointer', fontSize: '11px', background: '#fff', color: idx === categories.length - 1 ? '#d1d5db' : '#374151' }}
                      >▼</button>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: '500' }}>{cat.name}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Link to={`/item-categories/${cat.id}/items`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {cat.item_count} 件 →
                    </Link>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <Link to={`/item-categories/${cat.id}/edit`} style={{ color: '#2563eb', marginRight: '12px', textDecoration: 'none' }}>編集</Link>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
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
