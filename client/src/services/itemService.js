import { API_BASE_URL } from './apiBase.js';

const BASE = `${API_BASE_URL}/api/item-categories`;

export async function fetchItems(categoryId) {
  const res = await fetch(`${BASE}/${categoryId}/items`);
  if (!res.ok) throw new Error('小項目一覧の取得に失敗しました');
  return res.json();
}

export async function fetchItemById(categoryId, itemId) {
  const res = await fetch(`${BASE}/${categoryId}/items/${itemId}`);
  if (!res.ok) throw new Error('小項目情報の取得に失敗しました');
  return res.json();
}

export async function createItem(categoryId, data) {
  const res = await fetch(`${BASE}/${categoryId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '小項目の登録に失敗しました');
  }
  return res.json();
}

export async function updateItem(categoryId, itemId, data) {
  const res = await fetch(`${BASE}/${categoryId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '小項目の更新に失敗しました');
  }
  return res.json();
}

export async function deleteItem(categoryId, itemId) {
  const res = await fetch(`${BASE}/${categoryId}/items/${itemId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '小項目の削除に失敗しました');
  }
  return res.json();
}

export async function moveItemSort(categoryId, itemId, direction) {
  const res = await fetch(`${BASE}/${categoryId}/items/${itemId}/sort`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '並び順の変更に失敗しました');
  }
  return res.json();
}
