const BASE = 'http://localhost:3001/api/invoices';

export async function fetchInvoices({ search = '', page = 1, limit = 20, date_from = '', date_to = '', customer_id = '' } = {}) {
  const params = new URLSearchParams({ search, page, limit });
  if (date_from) params.set('date_from', date_from);
  if (date_to) params.set('date_to', date_to);
  if (customer_id) params.set('customer_id', customer_id);
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error('請求書一覧の取得に失敗しました');
  return res.json();
}

export async function fetchInvoiceById(id) {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('請求書の取得に失敗しました');
  return res.json();
}

export async function createInvoice(data) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error || '請求書の作成に失敗しました'), { invoice_id: err.invoice_id });
  }
  return res.json();
}

export async function updateInvoice(id, data) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '請求書の更新に失敗しました');
  }
  return res.json();
}

export async function updatePaymentStatus(id, { payment_status, paid_date }) {
  const res = await fetch(`${BASE}/${id}/payment-status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_status, paid_date }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '入金ステータスの更新に失敗しました');
  }
  return res.json();
}
