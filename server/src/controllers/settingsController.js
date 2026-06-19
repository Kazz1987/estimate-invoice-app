import pool from '../config/database.js';

const SETTINGS_COLUMNS = `
  id, company_name, representative_name, postal_code, address,
  phone, fax, email, invoice_registration_number,
  bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder,
  seal_label, created_at, updated_at
`;

const EMAIL_FORMAT_REGEX = /@/;

// company_settings テーブルの列定義（VARCHAR長）に対応
const FIELD_LIMITS = {
  company_name: 255,
  representative_name: 100,
  postal_code: 10,
  address: 500,
  phone: 20,
  fax: 20,
  email: 255,
  invoice_registration_number: 20,
  bank_name: 100,
  bank_branch: 100,
  bank_account_type: 20,
  bank_account_number: 20,
  bank_account_holder: 100,
  seal_label: 50,
};

const FIELD_LABELS = {
  company_name: '会社名',
  representative_name: '代表者名',
  postal_code: '郵便番号',
  address: '住所',
  phone: '電話番号',
  fax: 'FAX番号',
  email: 'メールアドレス',
  invoice_registration_number: 'インボイス登録番号',
  bank_name: '銀行名',
  bank_branch: '支店名',
  bank_account_type: '口座種別',
  bank_account_number: '口座番号',
  bank_account_holder: '口座名義',
  seal_label: '印鑑欄ラベル',
};

// 入力値を検証し、トリム済みの値（または未指定ならnull）のマップを返す。
// 不正な入力があれば最初に見つかったエラーメッセージを返す。
function validateAndNormalize(body) {
  const values = {};

  for (const key of Object.keys(FIELD_LIMITS)) {
    const raw = body[key];

    if (raw === undefined || raw === null || raw === '') {
      values[key] = key === 'seal_label' ? '印' : null;
      continue;
    }

    if (typeof raw !== 'string') {
      return { error: `${FIELD_LABELS[key]}の形式が正しくありません` };
    }

    const trimmed = raw.trim();

    if (trimmed.length > FIELD_LIMITS[key]) {
      return { error: `${FIELD_LABELS[key]}は${FIELD_LIMITS[key]}文字以内で入力してください` };
    }

    values[key] = trimmed || (key === 'seal_label' ? '印' : null);
  }

  if (!values.company_name) {
    return { error: '会社名は必須です' };
  }

  if (values.email && !EMAIL_FORMAT_REGEX.test(values.email)) {
    return { error: 'メールアドレスの形式が正しくありません' };
  }

  return { values };
}

export async function getSettings(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT ${SETTINGS_COLUMNS} FROM company_settings ORDER BY id LIMIT 1`
    );
    if (!rows[0]) return res.status(404).json({ error: '自社情報が見つかりません' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}

export async function updateSettings(req, res) {
  try {
    const { error, values } = validateAndNormalize(req.body || {});
    if (error) {
      return res.status(400).json({ error });
    }

    const { rows: existingRows } = await pool.query('SELECT id FROM company_settings ORDER BY id LIMIT 1');
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: '自社情報が見つかりません' });

    await pool.query(
      `UPDATE company_settings
       SET company_name = $1, representative_name = $2, postal_code = $3, address = $4,
           phone = $5, fax = $6, email = $7, invoice_registration_number = $8,
           bank_name = $9, bank_branch = $10, bank_account_type = $11, bank_account_number = $12, bank_account_holder = $13,
           seal_label = $14
       WHERE id = $15`,
      [
        values.company_name, values.representative_name, values.postal_code, values.address,
        values.phone, values.fax, values.email, values.invoice_registration_number,
        values.bank_name, values.bank_branch, values.bank_account_type, values.bank_account_number, values.bank_account_holder,
        values.seal_label,
        existing.id,
      ]
    );

    const { rows } = await pool.query(
      `SELECT ${SETTINGS_COLUMNS} FROM company_settings WHERE id = $1`,
      [existing.id]
    );

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
}
