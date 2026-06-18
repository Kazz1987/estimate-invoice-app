const BASE = 'http://localhost:3001/api/settings';

export async function fetchSettings() {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('自社情報の取得に失敗しました');
  return res.json();
}

export async function updateSettings(data) {
  const res = await fetch(BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '自社情報の更新に失敗しました');
  }
  return res.json();
}
