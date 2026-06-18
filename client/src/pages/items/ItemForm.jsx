import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchCategoryById } from '../../services/itemCategoryService';
import { createItem, fetchItemById, updateItem } from '../../services/itemService';

const FIELDS = [
  { key: 'name',        label: '小項目名',   required: true, placeholder: '例：基本設計' },
  { key: 'unit',        label: '単位',        placeholder: '例：式、時間、個' },
  { key: 'unit_price',  label: '単価（円）',  placeholder: '例：50000', type: 'number' },
  { key: 'description', label: '説明・備考',  multiline: true },
];

const empty = { name: '', unit: '', unit_price: '', description: '' };

export default function ItemForm() {
  const { categoryId, id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategoryById(categoryId)
      .then((c) => setCategoryName(c.name))
      .catch((e) => setError(e.message));

    if (!isEdit) return;
    fetchItemById(categoryId, id)
      .then((item) => setForm({
        name:        item.name        ?? '',
        unit:        item.unit        ?? '',
        unit_price:  String(item.unit_price ?? ''),
        description: item.description ?? '',
      }))
      .catch((e) => setError(e.message));
  }, [categoryId, id, isEdit]);

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      isEdit
        ? await updateItem(categoryId, id, form)
        : await createItem(categoryId, form);
      navigate(`/item-categories/${categoryId}/items`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#374151' };

  return (
    <div style={{ padding: '24px', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ marginBottom: '8px' }}>
        <Link to={`/item-categories/${categoryId}/items`} style={{ color: '#6b7280', textDecoration: 'none', fontSize: '13px' }}>
          ← {categoryName || '大項目'} の小項目一覧
        </Link>
      </div>
      <h1 style={{ fontSize: '22px', marginBottom: '24px' }}>{isEdit ? '小項目編集' : '小項目登録'}</h1>

      {error && <p style={{ color: '#dc2626', marginBottom: '12px' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {FIELDS.map(({ key, label, required, placeholder, type, multiline }) => (
          <div key={key} style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            {multiline ? (
              <textarea value={form[key]} onChange={handleChange(key)} rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            ) : (
              <input
                type={type || 'text'}
                value={form[key]}
                onChange={handleChange(key)}
                placeholder={placeholder}
                required={required}
                min={type === 'number' ? '0' : undefined}
                style={inputStyle}
              />
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="submit" disabled={loading}
            style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '送信中...' : isEdit ? '更新する' : '登録する'}
          </button>
          <button type="button" onClick={() => navigate(`/item-categories/${categoryId}/items`)}
            style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
