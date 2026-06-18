import pool from '../config/database.js';

export async function getCategories(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT ic.id, ic.name, ic.sort_order,
             COUNT(i.id) AS item_count
      FROM item_categories ic
      LEFT JOIN items i ON i.category_id = ic.id AND i.is_deleted = 0
      WHERE ic.is_deleted = 0
      GROUP BY ic.id, ic.name, ic.sort_order
      ORDER BY ic.sort_order, ic.id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const [[row]] = await pool.query(
      'SELECT id, name, sort_order FROM item_categories WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (!row) return res.status(404).json({ error: '大項目が見つかりません' });
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function createCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '大項目名は必須です' });

    const [[{ maxSort }]] = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS maxSort FROM item_categories WHERE is_deleted = 0'
    );

    const [result] = await pool.query(
      'INSERT INTO item_categories (name, sort_order) VALUES (?, ?)',
      [name.trim(), maxSort + 1]
    );

    const [[row]] = await pool.query(
      'SELECT id, name, sort_order FROM item_categories WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '大項目名は必須です' });

    const [[existing]] = await pool.query(
      'SELECT id FROM item_categories WHERE id = ? AND is_deleted = 0', [id]
    );
    if (!existing) return res.status(404).json({ error: '大項目が見つかりません' });

    await pool.query('UPDATE item_categories SET name = ? WHERE id = ?', [name.trim(), id]);

    const [[row]] = await pool.query(
      'SELECT id, name, sort_order FROM item_categories WHERE id = ?', [id]
    );
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    const [[existing]] = await pool.query(
      'SELECT id FROM item_categories WHERE id = ? AND is_deleted = 0', [id]
    );
    if (!existing) return res.status(404).json({ error: '大項目が見つかりません' });

    const [[{ cnt }]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM items WHERE category_id = ? AND is_deleted = 0', [id]
    );
    if (Number(cnt) > 0) return res.status(400).json({ error: '小項目が存在するため削除できません' });

    await pool.query('UPDATE item_categories SET is_deleted = 1 WHERE id = ?', [id]);
    res.json({ message: '大項目を削除しました' });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function moveCategory(req, res) {
  try {
    const { id } = req.params;
    const { direction } = req.body;

    const [all] = await pool.query(
      'SELECT id FROM item_categories WHERE is_deleted = 0 ORDER BY sort_order, id'
    );

    const idx = all.findIndex((r) => String(r.id) === String(id));
    if (idx < 0) return res.status(404).json({ error: '大項目が見つかりません' });

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx >= 0 && swapIdx < all.length) {
      [all[idx], all[swapIdx]] = [all[swapIdx], all[idx]];
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < all.length; i++) {
        await conn.query('UPDATE item_categories SET sort_order = ? WHERE id = ?', [i, all[i].id]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    const [updated] = await pool.query(`
      SELECT ic.id, ic.name, ic.sort_order, COUNT(i.id) AS item_count
      FROM item_categories ic
      LEFT JOIN items i ON i.category_id = ic.id AND i.is_deleted = 0
      WHERE ic.is_deleted = 0
      GROUP BY ic.id, ic.name, ic.sort_order
      ORDER BY ic.sort_order, ic.id
    `);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
