import pool from '../config/database.js';

export async function getItems(req, res) {
  try {
    const { categoryId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, category_id, name, unit, unit_price, description, sort_order
       FROM items
       WHERE category_id = $1 AND is_deleted = 0
       ORDER BY sort_order, id`,
      [categoryId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function getItemById(req, res) {
  try {
    const { categoryId, itemId } = req.params;
    const { rows } = await pool.query(
      `SELECT id, category_id, name, unit, unit_price, description, sort_order
       FROM items WHERE id = $1 AND category_id = $2 AND is_deleted = 0`,
      [itemId, categoryId]
    );
    if (!rows[0]) return res.status(404).json({ error: '小項目が見つかりません' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function createItem(req, res) {
  try {
    const { categoryId } = req.params;
    const { name, unit, unit_price, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '小項目名は必須です' });

    const { rows: catRows } = await pool.query(
      'SELECT id FROM item_categories WHERE id = $1 AND is_deleted = 0', [categoryId]
    );
    if (!catRows[0]) return res.status(404).json({ error: '大項目が見つかりません' });

    const { rows: maxRows } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS "maxSort" FROM items WHERE category_id = $1 AND is_deleted = 0',
      [categoryId]
    );
    const maxSort = maxRows[0].maxSort;

    const price = Number(unit_price) || 0;
    const { rows: insertRows } = await pool.query(
      `INSERT INTO items (category_id, name, unit, unit_price, description, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [categoryId, name.trim(), unit?.trim() || null, price, description?.trim() || null, maxSort + 1]
    );

    const { rows } = await pool.query(
      'SELECT id, category_id, name, unit, unit_price, description, sort_order FROM items WHERE id = $1',
      [insertRows[0].id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function updateItem(req, res) {
  try {
    const { itemId } = req.params;
    const { name, unit, unit_price, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '小項目名は必須です' });

    const { rows: existingRows } = await pool.query(
      'SELECT id FROM items WHERE id = $1 AND is_deleted = 0', [itemId]
    );
    if (!existingRows[0]) return res.status(404).json({ error: '小項目が見つかりません' });

    const price = Number(unit_price) || 0;
    await pool.query(
      'UPDATE items SET name = $1, unit = $2, unit_price = $3, description = $4 WHERE id = $5',
      [name.trim(), unit?.trim() || null, price, description?.trim() || null, itemId]
    );

    const { rows } = await pool.query(
      'SELECT id, category_id, name, unit, unit_price, description, sort_order FROM items WHERE id = $1',
      [itemId]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function deleteItem(req, res) {
  try {
    const { itemId } = req.params;

    const { rows: existingRows } = await pool.query(
      'SELECT id FROM items WHERE id = $1 AND is_deleted = 0', [itemId]
    );
    if (!existingRows[0]) return res.status(404).json({ error: '小項目が見つかりません' });

    await pool.query('UPDATE items SET is_deleted = 1 WHERE id = $1', [itemId]);
    res.json({ message: '小項目を削除しました' });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function moveItem(req, res) {
  try {
    const { categoryId, itemId } = req.params;
    const { direction } = req.body;

    const { rows: all } = await pool.query(
      'SELECT id FROM items WHERE category_id = $1 AND is_deleted = 0 ORDER BY sort_order, id',
      [categoryId]
    );

    const idx = all.findIndex((r) => String(r.id) === String(itemId));
    if (idx < 0) return res.status(404).json({ error: '小項目が見つかりません' });

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx >= 0 && swapIdx < all.length) {
      [all[idx], all[swapIdx]] = [all[swapIdx], all[idx]];
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < all.length; i++) {
        await client.query('UPDATE items SET sort_order = $1 WHERE id = $2', [i, all[i].id]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const { rows: updated } = await pool.query(
      `SELECT id, category_id, name, unit, unit_price, description, sort_order
       FROM items WHERE category_id = $1 AND is_deleted = 0 ORDER BY sort_order, id`,
      [categoryId]
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
