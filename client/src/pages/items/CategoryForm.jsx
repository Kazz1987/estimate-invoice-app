import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createCategory, fetchCategoryById, updateCategory } from '../../services/itemCategoryService';

export default function CategoryForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    fetchCategoryById(id)
      .then((c) => setName(c.name))
      .catch((e) => setError(e.message));
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      isEdit ? await updateCategory(id, { name }) : await createCategory({ name });
      navigate('/item-categories');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ marginBottom: '8px' }}>
        <Link to="/item-categories" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '13px' }}>
          ← 大項目一覧
        </Link>
      </div>
      <h1 style={{ fontSize: '22px', marginBottom: '24px' }}>{isEdit ? '大項目編集' : '大項目登録'}</h1>

      {error && <p style={{ color: '#dc2626', marginBottom: '12px' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
            大項目名 <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：設計費、材料費、施工費"
            required
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="submit" disabled={loading}
            style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '送信中...' : isEdit ? '更新する' : '登録する'}
          </button>
          <button type="button" onClick={() => navigate('/item-categories')}
            style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
