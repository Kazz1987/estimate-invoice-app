import { useState, useEffect, useRef } from 'react';
import { fetchCustomers } from '../../services/customerService';
import { PRESETS, rangeForPreset } from '../../utils/dateRange';

const selectStyle = {
  padding: '7px 10px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  background: '#fff',
};

export default function FilterBar({ defaultPreset = 'all', showCustomerFilter = false, onChange }) {
  const [preset, setPreset] = useState(defaultPreset);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!showCustomerFilter) return;
    fetchCustomers({ limit: 1000 })
      .then((data) => setCustomers(data.customers))
      .catch(() => setCustomers([]));
  }, [showCustomerFilter]);

  useEffect(() => {
    const { date_from, date_to } = rangeForPreset(preset, { date_from: customFrom, date_to: customTo });
    onChangeRef.current({ date_from, date_to, customer_id: customerId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo, customerId]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <label style={{ fontSize: '13px', color: '#6b7280' }}>期間:</label>
        <select value={preset} onChange={(e) => setPreset(e.target.value)} style={selectStyle}>
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>

      {preset === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            style={selectStyle}
          />
          <span style={{ color: '#6b7280' }}>〜</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            style={selectStyle}
          />
        </div>
      )}

      {showCustomerFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: '#6b7280' }}>顧客:</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={selectStyle}>
            <option value="">すべて</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
