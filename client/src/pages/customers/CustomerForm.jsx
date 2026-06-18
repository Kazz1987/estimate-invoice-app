import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCustomer, fetchCustomerById, updateCustomer } from '../../services/customerService';

const FIELDS = [
  { key: 'name', label: '顧客名', required: true, placeholder: '株式会社サンプル' },
  { key: 'contact_name', label: '担当者名', placeholder: '山田 太郎' },
  { key: 'postal_code', label: '郵便番号', placeholder: '000-0000' },
  { key: 'address', label: '住所', placeholder: '東京都千代田区...' },
  { key: 'phone', label: '電話番号', placeholder: '03-0000-0000' },
  { key: 'email', label: 'メールアドレス', placeholder: 'example@example.com' },
  { key: 'notes', label: '備考', multiline: true },
];

const empty = { name: '', contact_name: '', postal_code: '', address: '', phone: '', email: '', notes: '' };

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    fetchCustomerById(id)
      .then((c) => setForm({ name: c.name ?? '', contact_name: c.contact_name ?? '', postal_code: c.postal_code ?? '', address: c.address ?? '', phone: c.phone ?? '', email: c.email ?? '', notes: c.notes ?? '' }))
      .catch((e) => setError(e.message));
  }, [id, isEdit]);

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await updateCustomer(id, form);
      } else {
        await createCustomer(form);
      }
      navigate('/customers');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600', color: '#374151' };

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', marginBottom: '24px' }}>{isEdit ? '顧客編集' : '顧客登録'}</h1>

      {error && <p style={{ color: '#dc2626', marginBottom: '12px' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {FIELDS.map(({ key, label, required, placeholder, multiline }) => (
          <div key={key} style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            {multiline ? (
              <textarea value={form[key]} onChange={handleChange(key)} rows={4}
                style={{ ...inputStyle, resize: 'vertical' }} />
            ) : (
              <input type="text" value={form[key]} onChange={handleChange(key)}
                placeholder={placeholder} required={required} style={inputStyle} />
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="submit" disabled={loading}
            style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '送信中...' : isEdit ? '更新する' : '登録する'}
          </button>
          <button type="button" onClick={() => navigate('/customers')}
            style={{ flex: 1, padding: '10px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
