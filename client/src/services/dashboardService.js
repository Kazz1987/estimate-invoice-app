import { API_BASE_URL } from './apiBase.js';

const BASE = `${API_BASE_URL}/api/dashboard`;

export async function fetchDashboardSummary({ date_from = '', date_to = '' } = {}) {
  const params = new URLSearchParams();
  if (date_from) params.set('date_from', date_from);
  if (date_to) params.set('date_to', date_to);
  const qs = params.toString();
  const res = await fetch(qs ? `${BASE}?${qs}` : BASE);
  if (!res.ok) throw new Error('ダッシュボード情報の取得に失敗しました');
  return res.json();
}
