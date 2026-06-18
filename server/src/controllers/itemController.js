import pool from '../config/database.js';

export async function getItems(req, res) {
  try {
    const { categoryId } = req.params;
    const [rows] = await pool.query(
      `SELECT id, category_id, name, unit, unit_price, description, sort_order
       FROM items
       WHERE category_id = ? AND is_deleted = 0
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
    const [[row]] = await pool.query(
      `SELECT id, category_id, name, unit, unit_price, description, sort_order
       FROM items WHERE id = ? AND category_id = ? AND is_deleted = 0`,
      [itemId, categoryId]
    );
    if (!row) return res.status(404).json({ error: '小項目が見つかりません' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function createItem(req, res) {
  try {
    const { categoryId } = req.params;
    const { name, unit, unit_price, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '小項目名は必須です' });

    const [[cat]] = await pool.query(
      'SELECT id FROM item_categories WHERE id = ? AND is_deleted = 0', [categoryId]
    );
    if (!cat) return res.status(404).json({ error: '大項目が見つかりません' });

    const [[{ maxSort }]] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS maxSort FROM items WHERE category_id = ? AND is_deleted = 0',
      [categoryId]
    );

    const price = Number(unit_price) || 0;
    const [result] = await pool.query(
      `INSERT INTO items (category_id, name, unit, unit_price, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [categoryId, name.trim(), unit?.trim() || null, price, description?.trim() || null, maxSort + 1]
    );

    const [[row]] = await pool.query(
      'SELECT id, category_id, name, unit, unit_price, description, sort_order FROM items WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function updateItem(req, res) {
  try {
    const { itemId } = req.params;
    const { name, unit, unit_price, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '小項目名は必須です' });

    const [[existing]] = await pool.query(
      'SELECT id FROM items WHERE id = ? AND is_deleted = 0', [itemId]
    );
    if (!existing) return res.status(404).json({ error: '小項目が見つかりません' });

    const price = Number(unit_price) || 0;
    await pool.query(
      'UPDATE items SET name = ?, unit = ?, unit_price = ?, description = ? WHERE id = ?',
      [name.trim(), unit?.trim() || null, price, description?.trim() || null, itemId]
    );

    const [[row]] = await pool.query(
      'SELECT id, category_id, name, unit, unit_price, description, sort_order FROM items WHERE id = ?',
      [itemId]
    );
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function deleteItem(req, res) {
  try {
    const { itemId } = req.params;

    const [[existing]] = await pool.query(
      'SELECT id FROM items WHERE id = ? AND is_deleted = 0', [itemId]
    );
    if (!existing) return res.status(404).json({ error: '小項目が見つかりません' });

    await pool.query('UPDATE items SET is_deleted = 1 WHERE id = ?', [itemId]);
    res.json({ message: '小項目を削除しました' });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function moveItem(req, res) {
  try {
    const { categoryId, itemId } = req.params;
    const { direction } = req.body;

    const [all] = await pool.query(
      'SELECT id FROM items WHERE category_id = ? AND is_deleted = 0 ORDER BY sort_order, id',
      [categoryId]
    );

    const idx = all.findIndex((r) => String(r.id) === String(itemId));
    if (idx < 0) return res.status(404).json({ error: '小項目が見つかりません' });

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx >= 0 && swapIdx < all.length) {
      [all[idx], all[swapIdx]] = [all[swapIdx], all[idx]];
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < all.length; i++) {
        await conn.query('UPDATE items SET sort_order = ? WHERE id = ?', [i, all[i].id]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    const [updated] = await pool.query(
      `SELECT id, category_id, name, unit, unit_price, description, sort_order
       FROM items WHERE category_id = ? AND is_deleted = 0 ORDER BY sort_order, id`,
      [categoryId]
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
