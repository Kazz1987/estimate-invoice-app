const BASE = 'http://localhost:3001/api/customers';

export async function fetchCustomers({ search = '', page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ search, page, limit });
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error('顧客一覧の取得に失敗しました');
  return res.json();
}

export async function fetchCustomerById(id) {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('顧客情報の取得に失敗しました');
  return res.json();
}

export async function createCustomer(data) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '顧客の登録に失敗しました');
  }
  return res.json();
}

export async function updateCustomer(id, data) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '顧客の更新に失敗しました');
  }
  return res.json();
}

export async function deleteCustomer(id) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '顧客の削除に失敗しました');
  }
  return res.json();
}
