import pool from '../config/database.js';

export async function getCategories(req, res) {
  try {
    const { rows } = await pool.query(`
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
    const { rows } = await pool.query(
      'SELECT id, name, sort_order FROM item_categories WHERE id = $1 AND is_deleted = 0',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: '大項目が見つかりません' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function createCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '大項目名は必須です' });

    const { rows: maxRows } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) AS "maxSort" FROM item_categories WHERE is_deleted = 0'
    );
    const maxSort = maxRows[0].maxSort;

    const { rows: insertRows } = await pool.query(
      'INSERT INTO item_categories (name, sort_order) VALUES ($1, $2) RETURNING id',
      [name.trim(), maxSort + 1]
    );

    const { rows } = await pool.query(
      'SELECT id, name, sort_order FROM item_categories WHERE id = $1',
      [insertRows[0].id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '大項目名は必須です' });

    const { rows: existingRows } = await pool.query(
      'SELECT id FROM item_categories WHERE id = $1 AND is_deleted = 0', [id]
    );
    if (!existingRows[0]) return res.status(404).json({ error: '大項目が見つかりません' });

    await pool.query('UPDATE item_categories SET name = $1 WHERE id = $2', [name.trim(), id]);

    const { rows } = await pool.query(
      'SELECT id, name, sort_order FROM item_categories WHERE id = $1', [id]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    const { rows: existingRows } = await pool.query(
      'SELECT id FROM item_categories WHERE id = $1 AND is_deleted = 0', [id]
    );
    if (!existingRows[0]) return res.status(404).json({ error: '大項目が見つかりません' });

    const { rows: cntRows } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM items WHERE category_id = $1 AND is_deleted = 0', [id]
    );
    if (Number(cntRows[0].cnt) > 0) return res.status(400).json({ error: '小項目が存在するため削除できません' });

    await pool.query('UPDATE item_categories SET is_deleted = 1 WHERE id = $1', [id]);
    res.json({ message: '大項目を削除しました' });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function moveCategory(req, res) {
  try {
    const { id } = req.params;
    const { direction } = req.body;

    const { rows: all } = await pool.query(
      'SELECT id FROM item_categories WHERE is_deleted = 0 ORDER BY sort_order, id'
    );

    const idx = all.findIndex((r) => String(r.id) === String(id));
    if (idx < 0) return res.status(404).json({ error: '大項目が見つかりません' });

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx >= 0 && swapIdx < all.length) {
      [all[idx], all[swapIdx]] = [all[swapIdx], all[idx]];
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < all.length; i++) {
        await client.query('UPDATE item_categories SET sort_order = $1 WHERE id = $2', [i, all[i].id]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const { rows: updated } = await pool.query(`
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
