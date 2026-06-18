const pad2 = (n) => String(n).padStart(2, '0');

const toYmd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function monthRange(monthOffset) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
  return { date_from: toYmd(start), date_to: toYmd(end) };
}

export const PRESETS = [
  { key: 'all', label: '全部' },
  { key: 'thisMonth', label: '今月' },
  { key: 'lastMonth', label: '先月' },
  { key: 'nextMonth', label: '来月' },
  { key: 'custom', label: '期間指定' },
];

export function rangeForPreset(preset, custom = {}) {
  switch (preset) {
    case 'thisMonth': return monthRange(0);
    case 'lastMonth': return monthRange(-1);
    case 'nextMonth': return monthRange(1);
    case 'custom': return { date_from: custom.date_from || '', date_to: custom.date_to || '' };
    case 'all':
    default:
      return { date_from: '', date_to: '' };
  }
}
