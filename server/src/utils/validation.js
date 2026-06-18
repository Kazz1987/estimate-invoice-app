const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(value) {
  if (!DATE_FORMAT_REGEX.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isValidId(value) {
  return /^\d+$/.test(String(value));
}
