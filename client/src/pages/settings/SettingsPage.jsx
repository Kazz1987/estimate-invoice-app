import { useState, useEffect } from 'react';
import { fetchSettings, updateSettings } from '../../services/settingsService';

const FIELDS = [
  { key: 'company_name', label: '会社名', required: true, placeholder: '株式会社サンプル' },
  { key: 'representative_name', label: '代表者名', placeholder: '山田 太郎' },
  { key: 'postal_code', label: '郵便番号', placeholder: '000-0000' },
  { key: 'address', label: '住所', placeholder: '東京都千代田区...' },
  { key: 'phone', label: '電話番号', placeholder: '03-0000-0000' },
  { key: 'fax', label: 'FAX番号', placeholder: '03-0000-0001' },
  { key: 'email', label: 'メールアドレス', placeholder: 'example@example.com' },
  { key: 'invoice_registration_number', label: 'インボイス登録番号', placeholder: 'T1234567890123' },
  { key: 'bank_name', label: '銀行名', placeholder: '〇〇銀行' },
  { key: 'bank_branch', label: '支店名', placeholder: '〇〇支店' },
  { key: 'bank_account_type', label: '口座種別', placeholder: '普通' },
  { key: 'bank_account_number', label: '口座番号', placeholder: '1234567' },
  { key: 'bank_account_holder', label: '口座名義', placeholder: 'カブシキガイシャ サンプル' },
  { key: 'seal_label', label: '印鑑欄ラベル', placeholder: '印' },
];

const empty = FIELDS.reduce((acc, { key }) => ({ ...acc, [key]: '' }), {});

export default function SettingsPage() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        const next = { ...empty };
        FIELDS.forEach(({ key }) => { next[key] = s[key] ?? ''; });
        setForm(next);
      })
      .catch((e) => setError(e.message));
  }, []);

  const handleChange = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await updateSettings(form);
      setMessage('自社情報を保存しました');
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
      <h1 style={{ fontSize: '22px', marginBottom: '24px' }}>自社情報設定</h1>

      {error && <p style={{ color: '#dc2626', marginBottom: '12px' }}>{error}</p>}
      {message && <p style={{ color: '#16a34a', marginBottom: '12px' }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        {FIELDS.map(({ key, label, required, placeholder }) => (
          <div key={key} style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            <input type="text" value={form[key]} onChange={handleChange(key)}
              placeholder={placeholder} required={required} style={inputStyle} />
          </div>
        ))}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button type="submit" disabled={loading}
            style={{ flex: 1, padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '保存中...' : '保存する'}
          </button>
        </div>
      </form>
    </div>
  );
}
