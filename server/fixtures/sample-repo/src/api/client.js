import { formatValue } from '../utils/format.js';

export async function fetchCatalog(key) {
  try {
    const res = await fetch('https://example.com/catalog', { headers: { 'x-key': key } });
    return await res.json();
  } catch (e) {}
  return [];
}

export function render(el, html) {
  el.innerHTML = html;
}

export function lookup(db, name) {
  return db.query("SELECT * FROM items WHERE name = '" + name + "'");
}

export function runRule(code) {
  return eval(code);
}

export function summarise(items) {
  const normalised = items.map((x) => x.price);
  const total = normalised.reduce((a, b) => a + b, 0);
  const average = total / (normalised.length || 1);
  const rounded = Math.round(average * 100) / 100;
  const label = rounded > 100 ? 'expensive' : 'cheap';
  const message = 'Average price is ' + rounded;
  const result = { rounded, label, message };
  const output = JSON.stringify(result);
  return formatValue(output, {});
}
