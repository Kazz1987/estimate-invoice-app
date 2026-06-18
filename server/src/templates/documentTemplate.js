/**
 * 見積書・請求書共通HTMLテンプレート
 * type: 'estimate' | 'invoice'
 */
export function buildDocumentHtml(doc, type, company) {
  const isInvoice = type === 'invoice';
  const title      = isInvoice ? '請求書' : '見積書';
  const docNumber  = isInvoice ? doc.invoice_number  : doc.estimate_number;
  const primaryDate      = doc.issue_date;
  const primaryDateLabel = isInvoice ? '請求日' : '発行日';
  const secondaryDate      = isInvoice ? doc.due_date    : doc.expiry_date;
  const secondaryDateLabel = isInvoice ? '支払期限' : '有効期限';

  const fmtDate = (d) => {
    if (!d) return '—';
    const s = typeof d === 'string' ? d : new Date(d).toISOString();
    const [y, m, day] = s.slice(0, 10).split('-');
    return `${y}年${Number(m)}月${Number(day)}日`;
  };

  const fmtMoney = (n) => `¥${Number(n || 0).toLocaleString('ja-JP')}`;

  const itemRows = (doc.items || []).map((it, i) => `
    <tr class="${i % 2 === 1 ? 'row-alt' : ''}">
      <td class="td-cat">${esc(it.category_name || '')}</td>
      <td class="td-name">${esc(it.item_name || '')}</td>
      <td class="td-desc">${esc(it.description || '')}</td>
      <td class="td-num">${Number(it.quantity)}</td>
      <td class="td-unit">${esc(it.unit || '')}</td>
      <td class="td-num">${fmtMoney(it.unit_price)}</td>
      <td class="td-num td-amount">${fmtMoney(it.amount)}</td>
    </tr>
  `).join('');

  const notesHtml = doc.notes ? `
    <div class="section-box">
      <div class="section-label">備考</div>
      <div class="notes-text">${esc(doc.notes).replace(/\n/g, '<br>')}</div>
    </div>` : '';

  const termsHtml = (!isInvoice && doc.terms) ? `
    <div class="section-box">
      <div class="section-label">取引条件</div>
      <div class="notes-text">${esc(doc.terms).replace(/\n/g, '<br>')}</div>
    </div>` : '';

  const companyInfoHtml = company ? `
    <div class="company-info">
      <div class="company-name">${esc(company.company_name)}</div>
      ${company.postal_code ? `<div>〒${esc(company.postal_code)}</div>` : ''}
      ${company.address ? `<div>${esc(company.address)}</div>` : ''}
      ${company.phone ? `<div>TEL ${esc(company.phone)}${company.fax ? `　FAX ${esc(company.fax)}` : ''}</div>` : (company.fax ? `<div>FAX ${esc(company.fax)}</div>` : '')}
      ${company.email ? `<div>${esc(company.email)}</div>` : ''}
      ${company.invoice_registration_number ? `<div>登録番号: ${esc(company.invoice_registration_number)}</div>` : ''}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${title} ${docNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Hiragino Kaku Gothic Pro', 'Meiryo', 'MS PGothic', sans-serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: #fff;
    padding: 12mm 14mm;
  }

  /* ── ヘッダー ── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10mm;
  }
  .doc-title-block { display: flex; flex-direction: column; gap: 4px; }
  .doc-title {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: 6px;
    color: #1a1a1a;
  }
  .doc-number {
    font-size: 10pt;
    color: #555;
    font-family: 'Courier New', monospace;
  }

  /* ── 自社情報 ── */
  .company-info {
    text-align: right;
    font-size: 8.5pt;
    color: #333;
    line-height: 1.5;
    margin-bottom: 4mm;
  }
  .company-info .company-name {
    font-size: 11pt;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 2px;
  }

  /* ── 印鑑欄 ── */
  .hanko-section { text-align: right; }
  .hanko-table {
    display: inline-table;
    border-collapse: collapse;
    font-size: 9pt;
  }
  .hanko-table th, .hanko-table td {
    border: 1px solid #555;
    width: 20mm;
    text-align: center;
  }
  .hanko-table th {
    background: #f0f0f0;
    padding: 2px 0;
    font-weight: 600;
    font-size: 8pt;
  }
  .hanko-table td {
    height: 16mm;
    vertical-align: middle;
  }

  /* ── 宛先・日付ブロック ── */
  .meta-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 8mm;
    gap: 20px;
  }
  .customer-block { flex: 1; }
  .customer-name {
    font-size: 14pt;
    font-weight: 700;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 3px;
    margin-bottom: 4px;
    display: inline-block;
    min-width: 140px;
  }
  .honorific { font-size: 10pt; margin-left: 4px; color: #555; }
  .customer-sub { font-size: 9pt; color: #555; margin-top: 4px; }

  .date-block { min-width: 120px; text-align: right; }
  .date-table { border-collapse: collapse; margin-left: auto; font-size: 10pt; }
  .date-table td { padding: 2px 0 2px 12px; }
  .date-label { color: #555; white-space: nowrap; }
  .date-value { font-weight: 500; white-space: nowrap; }

  /* ── 件名 ── */
  .subject-row {
    margin-bottom: 6mm;
    font-size: 11pt;
  }
  .subject-label { color: #555; margin-right: 8px; font-size: 9pt; }
  .subject-value { font-weight: 600; }

  /* ── 明細テーブル ── */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
    margin-bottom: 4mm;
  }
  .items-table thead tr {
    background: #2c3e50;
    color: #fff;
  }
  .items-table th {
    padding: 5px 8px;
    text-align: left;
    font-weight: 600;
    white-space: nowrap;
  }
  .items-table th.th-num { text-align: right; }
  .items-table td {
    padding: 5px 8px;
    border-bottom: 1px solid #e8e8e8;
    vertical-align: top;
  }
  .items-table .row-alt td { background: #f9f9f9; }
  .td-cat   { color: #555; width: 14%; }
  .td-name  { font-weight: 500; width: 22%; }
  .td-desc  { color: #555; width: 24%; font-size: 9pt; }
  .td-num   { text-align: right; white-space: nowrap; }
  .td-unit  { color: #555; width: 6%; text-align: center; }
  .td-amount { font-weight: 600; }

  /* ── 合計 ── */
  .totals-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 6mm;
  }
  .totals-table { border-collapse: collapse; font-size: 10pt; min-width: 200px; }
  .totals-table td { padding: 3px 0 3px 20px; }
  .totals-table .t-label { color: #555; border-top: 1px solid #e0e0e0; }
  .totals-table .t-value { text-align: right; border-top: 1px solid #e0e0e0; font-weight: 500; }
  .totals-table .grand-label {
    border-top: 2.5px solid #1a1a1a;
    font-size: 12pt;
    font-weight: 700;
    padding-top: 6px;
  }
  .totals-table .grand-value {
    border-top: 2.5px solid #1a1a1a;
    font-size: 14pt;
    font-weight: 700;
    text-align: right;
    padding-top: 6px;
  }

  /* ── 備考・取引条件 ── */
  .section-box {
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    padding: 6px 10px;
    margin-bottom: 5mm;
  }
  .section-label {
    font-size: 8.5pt;
    font-weight: 700;
    color: #555;
    margin-bottom: 4px;
  }
  .notes-text { font-size: 9.5pt; line-height: 1.6; }

  /* ── 印刷時設定 ── */
  @media print {
    body { padding: 0; }
    @page { size: A4; margin: 12mm 14mm; }
    .no-print { display: none !important; }
  }
</style>
<script>window.addEventListener('load', () => window.print());</script>
</head>
<body>

  <!-- ヘッダー（タイトル＋印鑑欄） -->
  <div class="doc-header">
    <div class="doc-title-block">
      <div class="doc-title">${title}</div>
      <div class="doc-number">No. ${esc(docNumber)}</div>
    </div>
    <div class="hanko-section">
      ${companyInfoHtml}
      <table class="hanko-table">
        <thead>
          <tr><th>担当</th><th>確認</th><th>承認</th></tr>
        </thead>
        <tbody>
          <tr><td></td><td></td><td></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 宛先・日付 -->
  <div class="meta-row">
    <div class="customer-block">
      <div>
        <span class="customer-name">${esc(doc.customer_name || '')}</span>
        <span class="honorific">御中</span>
      </div>
      ${doc.contact_name ? `<div class="customer-sub">${esc(doc.contact_name)} 様</div>` : ''}
      ${doc.address ? `<div class="customer-sub">${esc(doc.address)}</div>` : ''}
    </div>
    <div class="date-block">
      <table class="date-table">
        <tr>
          <td class="date-label">${primaryDateLabel}</td>
          <td class="date-value">${fmtDate(primaryDate)}</td>
        </tr>
        ${secondaryDate ? `<tr>
          <td class="date-label">${secondaryDateLabel}</td>
          <td class="date-value">${fmtDate(secondaryDate)}</td>
        </tr>` : ''}
        <tr>
          <td class="date-label">消費税率</td>
          <td class="date-value">${doc.tax_rate ?? 10}%</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- 件名 -->
  ${doc.title ? `<div class="subject-row">
    <span class="subject-label">件名</span>
    <span class="subject-value">${esc(doc.title)}</span>
  </div>` : ''}

  <!-- 明細 -->
  <table class="items-table">
    <thead>
      <tr>
        <th>大項目</th>
        <th>品目名</th>
        <th>説明</th>
        <th class="th-num">数量</th>
        <th>単位</th>
        <th class="th-num">単価</th>
        <th class="th-num">金額</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="7" style="text-align:center;color:#999">明細なし</td></tr>'}
    </tbody>
  </table>

  <!-- 合計 -->
  <div class="totals-row">
    <table class="totals-table">
      <tr>
        <td class="t-label">小計</td>
        <td class="t-value">${fmtMoney(doc.subtotal)}</td>
      </tr>
      <tr>
        <td class="t-label">消費税（${doc.tax_rate ?? 10}%）</td>
        <td class="t-value">${fmtMoney(doc.tax_amount)}</td>
      </tr>
      <tr>
        <td class="grand-label">合計（税込）</td>
        <td class="grand-value">${fmtMoney(doc.total)}</td>
      </tr>
    </table>
  </div>

  ${notesHtml}
  ${termsHtml}

</body>
</html>`;
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
