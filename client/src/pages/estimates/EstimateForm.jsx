import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { fetchCustomers } from '../../services/customerService';
import { fetchCategories, fetchCategoryById } from '../../services/itemCategoryService';
import { fetchItems } from '../../services/itemService';
import { createEstimate, fetchEstimateById, updateEstimate } from '../../services/estimateService';

// ─── helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const initForm = () => ({
  customer_id: '',
  title: '',
  issue_date: todayStr(),
  expiry_date: addDays(30),
  tax_rate: 10,
  notes: '',
  terms: '',
});

const newLine = () => ({
  item_id: null,
  category_name: '',
  item_name: '',
  description: '',
  quantity: 1,
  unit: '',
  unit_price: 0,
  amount: 0,
});

// ─── styles ───────────────────────────────────────────────────────────────────

const inputSm = {
  padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px',
  fontSize: '13px', boxSizing: 'border-box', width: '100%',
};
const labelSt = {
  display: 'block', marginBottom: '3px', fontSize: '12px',
  fontWeight: '600', color: '#374151',
};

// ─── component ────────────────────────────────────────────────────────────────

export default function EstimateForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(initForm);
  const [lines, setLines] = useState([newLine()]);
  const [customers, setCustomers] = useState([]);
  const [estimateNumber, setEstimateNumber] = useState('');

  // Item picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCategories, setPickerCategories] = useState([]);
  const [pickerCatId, setPickerCatId] = useState('');
  const [pickerItems, setPickerItems] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 顧客一覧読み込み
  useEffect(() => {
    fetchCustomers({ limit: 1000 })
      .then((d) => setCustomers(d.customers))
      .catch(() => {});
  }, []);

  // 編集時：既存データ読み込み
  useEffect(() => {
    if (!isEdit) return;
    fetchEstimateById(id).then((data) => {
      setEstimateNumber(data.estimate_number);
      setForm({
        customer_id: String(data.customer_id),
        title: data.title ?? '',
        issue_date: (data.issue_date ?? '').slice(0, 10),
        expiry_date: (data.expiry_date ?? '').slice(0, 10),
        tax_rate: Number(data.tax_rate),
        notes: data.notes ?? '',
        terms: data.terms ?? '',
      });
      setLines(
        data.items.map((it) => ({
          item_id: it.item_id,
          category_name: it.category_name ?? '',
          item_name: it.item_name ?? '',
          description: it.description ?? '',
          quantity: Number(it.quantity),
          unit: it.unit ?? '',
          unit_price: Number(it.unit_price),
          amount: Number(it.amount),
        }))
      );
    }).catch((e) => setError(e.message));
  }, [id, isEdit]);

  // Picker：大項目一覧
  useEffect(() => {
    if (!pickerOpen) return;
    setPickerLoading(true);
    fetchCategories()
      .then((cats) => setPickerCategories(cats))
      .catch(() => {})
      .finally(() => setPickerLoading(false));
  }, [pickerOpen]);

  // Picker：小項目一覧
  useEffect(() => {
    if (!pickerCatId) { setPickerItems([]); return; }
    setPickerLoading(true);
    fetchItems(pickerCatId)
      .then((items) => setPickerItems(items))
      .catch(() => {})
      .finally(() => setPickerLoading(false));
  }, [pickerCatId]);

  // ─── 計算 ───────────────────────────────────────────────────────────────────

  const subtotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const taxAmount = Math.floor(subtotal * Number(form.tax_rate) / 100);
  const totalAmt = subtotal + taxAmount;

  // ─── line handlers ──────────────────────────────────────────────────────────

  const handleLineChange = (idx, key, value) => {
    setLines((ls) =>
      ls.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [key]: value };
        if (key === 'quantity' || key === 'unit_price') {
          const q = key === 'quantity' ? value : l.quantity;
          const p = key === 'unit_price' ? value : l.unit_price;
          updated.amount = Math.round((Number(q) || 0) * (Number(p) || 0));
        }
        return updated;
      })
    );
  };

  const addLine = () => setLines((ls) => [...ls, newLine()]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  // Picker：品目選択
  const pickItem = (item) => {
    const catName = pickerCategories.find((c) => String(c.id) === String(pickerCatId))?.name ?? '';
    setLines((ls) => [
      ...ls,
      {
        item_id: item.id,
        category_name: catName,
        item_name: item.name,
        description: item.description ?? '',
        quantity: 1,
        unit: item.unit ?? '',
        unit_price: Number(item.unit_price),
        amount: Number(item.unit_price),
      },
    ]);
    setPickerOpen(false);
    setPickerCatId('');
    setPickerItems([]);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setPickerCatId('');
    setPickerItems([]);
  };

  // ─── submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validLines = lines.filter((l) => l.item_name.trim());
    if (!validLines.length) { setError('明細を1行以上入力してください'); return; }
    if (!form.customer_id) { setError('顧客を選択してください'); return; }

    setSubmitting(true);
    setError('');
    try {
      const payload = { ...form, items: validLines };
      if (isEdit) {
        await updateEstimate(id, payload);
        navigate(`/estimates/${id}`);
      } else {
        const { id: newId } = await createEstimate(payload);
        navigate(`/estimates/${newId}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* パンくず */}
      <div style={{ marginBottom: '8px' }}>
        <Link to="/estimates" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '13px' }}>
          ← 見積書一覧
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>
          {isEdit ? `見積書編集 — ${estimateNumber}` : '見積書新規作成'}
        </h1>
      </div>

      {error && (
        <p style={{ color: '#dc2626', background: '#fef2f2', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── ヘッダー ── */}
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* 顧客 */}
            <div>
              <label style={labelSt}>顧客名 <span style={{ color: '#dc2626' }}>*</span></label>
              <select
                value={form.customer_id}
                onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
                required
                style={{ ...inputSm, height: '34px' }}
              >
                <option value="">顧客を選択...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {/* 件名 */}
            <div>
              <label style={labelSt}>件名</label>
              <input type="text" value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例：Webサイト制作のご提案"
                style={inputSm} />
            </div>
            {/* 発行日 */}
            <div>
              <label style={labelSt}>発行日 <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" value={form.issue_date} required
                onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                style={inputSm} />
            </div>
            {/* 有効期限 */}
            <div>
              <label style={labelSt}>有効期限</label>
              <input type="date" value={form.expiry_date}
                onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                style={inputSm} />
            </div>
            {/* 消費税率 */}
            <div>
              <label style={labelSt}>消費税率</label>
              <select value={form.tax_rate}
                onChange={(e) => setForm((f) => ({ ...f, tax_rate: Number(e.target.value) }))}
                style={{ ...inputSm, height: '34px' }}>
                <option value={10}>10%（標準税率）</option>
                <option value={8}>8%（軽減税率）</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── 明細 ── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>明細</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={() => setPickerOpen(true)}
                style={{ padding: '6px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>
                品目から追加
              </button>
              <button type="button" onClick={addLine}
                style={{ padding: '6px 12px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}>
                + 行を追加
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  {['大項目', '品目名 *', '説明', '数量', '単位', '単価（円）', '金額（円）', ''].map((h) => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap', fontWeight: '600', color: '#374151' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px 6px' }}>
                      <input value={line.category_name}
                        onChange={(e) => handleLineChange(idx, 'category_name', e.target.value)}
                        style={{ ...inputSm, width: '120px' }} placeholder="大項目" />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input value={line.item_name}
                        onChange={(e) => handleLineChange(idx, 'item_name', e.target.value)}
                        style={{ ...inputSm, width: '160px' }} placeholder="品目名" />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        style={{ ...inputSm, width: '180px' }} placeholder="説明（任意）" />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input type="number" min="0" step="0.01" value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                        style={{ ...inputSm, width: '70px', textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input value={line.unit}
                        onChange={(e) => handleLineChange(idx, 'unit', e.target.value)}
                        style={{ ...inputSm, width: '60px' }} placeholder="式" />
                    </td>
                    <td style={{ padding: '6px 6px' }}>
                      <input type="number" min="0" step="1" value={line.unit_price}
                        onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                        style={{ ...inputSm, width: '110px', textAlign: 'right' }} />
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '500', whiteSpace: 'nowrap' }}>
                      ¥{Number(line.amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                      <button type="button" onClick={() => removeLine(idx)}
                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px' }}>
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 合計 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <table style={{ fontSize: '14px', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['小計', `¥${subtotal.toLocaleString()}`],
                  [`消費税（${form.tax_rate}%）`, `¥${taxAmount.toLocaleString()}`],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ padding: '4px 16px 4px 0', color: '#6b7280' }}>{label}</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', width: '120px' }}>{val}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #374151' }}>
                  <td style={{ padding: '8px 16px 4px 0', fontWeight: '700', fontSize: '16px' }}>合計（税込）</td>
                  <td style={{ padding: '8px 0 4px', textAlign: 'right', fontWeight: '700', fontSize: '16px' }}>
                    ¥{totalAmt.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 備考・取引条件 ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          {[
            { key: 'notes', label: '備考' },
            { key: 'terms', label: '取引条件' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label style={labelSt}>{label}</label>
              <textarea value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                rows={4} style={{ ...inputSm, resize: 'vertical' }} />
            </div>
          ))}
        </div>

        {/* ── ボタン ── */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" disabled={submitting}
            style={{ padding: '10px 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? '保存中...' : isEdit ? '更新する' : '見積書を作成'}
          </button>
          <button type="button" onClick={() => navigate('/estimates')}
            style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}>
            キャンセル
          </button>
        </div>
      </form>

      {/* ── 品目ピッカーモーダル ── */}
      {pickerOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) closePicker(); }}
        >
          <div style={{ background: '#fff', borderRadius: '10px', padding: '24px', width: '560px', maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>品目を選択</h2>
              <button onClick={closePicker}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#6b7280', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...labelSt, marginBottom: '6px' }}>大項目</label>
              <select
                value={pickerCatId}
                onChange={(e) => setPickerCatId(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              >
                <option value="">大項目を選択...</option>
                {pickerCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {pickerLoading ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>読み込み中...</p>
              ) : pickerCatId && pickerItems.length === 0 ? (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '16px' }}>小項目がありません</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  {pickerItems.length > 0 && (
                    <thead>
                      <tr style={{ background: '#f3f4f6' }}>
                        {['品目名', '単位', '単価（円）', ''].map((h) => (
                          <th key={h} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {pickerItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 10px', fontWeight: '500' }}>{item.name}</td>
                        <td style={{ padding: '8px 10px', color: '#6b7280' }}>{item.unit ?? '—'}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>¥{Number(item.unit_price).toLocaleString()}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <button onClick={() => pickItem(item)}
                            style={{ padding: '4px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            追加
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
