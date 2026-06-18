const BASE = 'http://localhost:3001/api/item-categories';

export async function fetchCategories() {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('大項目一覧の取得に失敗しました');
  return res.json();
}

export async function fetchCategoryById(id) {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('大項目情報の取得に失敗しました');
  return res.json();
}

export async function createCategory(data) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '大項目の登録に失敗しました');
  }
  return res.json();
}

export async function updateCategory(id, data) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '大項目の更新に失敗しました');
  }
  return res.json();
}

export async function deleteCategory(id) {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '大項目の削除に失敗しました');
  }
  return res.json();
}

export async function moveCategorySort(id, direction) {
  const res = await fetch(`${BASE}/${id}/sort`, {
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
