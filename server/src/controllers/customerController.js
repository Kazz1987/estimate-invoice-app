import pool from '../config/database.js';

const MAX_NAME_LENGTH = 100;
const EMAIL_FORMAT_REGEX = /@/;

function validateCustomerInput(name, email) {
  if (!name || !name.trim()) {
    return '顧客名は必須です';
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return `顧客名は${MAX_NAME_LENGTH}文字以内で入力してください`;
  }
  if (email && !EMAIL_FORMAT_REGEX.test(email)) {
    return 'メールアドレスの形式が正しくありません';
  }
  return null;
}

export async function getCustomers(req, res) {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const likeParam = `%${search}%`;

    const [rows] = await pool.query(
      `SELECT id, name, contact_name, phone, email, created_at
       FROM customers
       WHERE is_deleted = 0
         AND (name LIKE ? OR contact_name LIKE ?)
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [likeParam, likeParam, Number(limit), offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM customers
       WHERE is_deleted = 0
         AND (name LIKE ? OR contact_name LIKE ?)`,
      [likeParam, likeParam]
    );

    res.json({ customers: rows, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function getCustomerById(req, res) {
  try {
    const { id } = req.params;
    const [[customer]] = await pool.query(
      `SELECT id, name, contact_name, postal_code, address, phone, email, notes
       FROM customers WHERE id = ? AND is_deleted = 0`,
      [id]
    );
    if (!customer) return res.status(404).json({ error: '顧客が見つかりません' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function createCustomer(req, res) {
  try {
    const { name, contact_name, postal_code, address, phone, email, notes } = req.body;

    const validationError = validateCustomerInput(name, email);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const [result] = await pool.query(
      `INSERT INTO customers (name, contact_name, postal_code, address, phone, email, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), contact_name || null, postal_code || null, address || null, phone || null, email || null, notes || null]
    );

    const [[customer]] = await pool.query(
      `SELECT id, name, contact_name, postal_code, address, phone, email, notes, created_at
       FROM customers WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const { name, contact_name, postal_code, address, phone, email, notes } = req.body;

    const validationError = validateCustomerInput(name, email);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const [[existing]] = await pool.query(
      'SELECT id FROM customers WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (!existing) return res.status(404).json({ error: '顧客が見つかりません' });

    await pool.query(
      `UPDATE customers
       SET name = ?, contact_name = ?, postal_code = ?, address = ?, phone = ?, email = ?, notes = ?
       WHERE id = ?`,
      [name.trim(), contact_name || null, postal_code || null, address || null, phone || null, email || null, notes || null, id]
    );

    const [[customer]] = await pool.query(
      `SELECT id, name, contact_name, postal_code, address, phone, email, notes, updated_at
       FROM customers WHERE id = ?`,
      [id]
    );

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;

    const [[existing]] = await pool.query(
      'SELECT id FROM customers WHERE id = ? AND is_deleted = 0',
      [id]
    );
    if (!existing) return res.status(404).json({ error: '顧客が見つかりません' });

    await pool.query(
      'UPDATE customers SET is_deleted = 1 WHERE id = ?',
      [id]
    );

    res.json({ message: '顧客を削除しました' });
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
