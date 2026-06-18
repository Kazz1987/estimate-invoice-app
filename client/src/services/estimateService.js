const BASE = 'http://localhost:3001/api/estimates';

export async function fetchEstimates({ search = '', page = 1, limit = 20, date_from = '', date_to = '', customer_id = '' } = {}) {
  const params = new URLSearchParams({ search, page, limit });
  if (date_from) params.set('date_from', date_from);
  if (date_to) params.set('date_to', date_to);
  if (customer_id) params.set('customer_id', customer_id);
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error('見積書一覧の取得に失敗しました');
  return res.json();
}

export async function fetchEstimateById(id) {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('見積書の取得に失敗しました');
  return res.json();
}

export async function createEstimate(data) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '見積書の作成に失敗しました');
  }
  return res.json();
}

export async function updateEstimate(id, data) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '見積書の更新に失敗しました');
  }
  return res.json();
}

export async function updateEstimateStatus(id, key, value) {
  const res = await fetch(`${BASE}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'ステータスの変更に失敗しました');
  }
  return res.json();
}
