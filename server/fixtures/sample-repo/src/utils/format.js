export function formatPrice(value) {
  return `$${value}`;
}

export function formatValue(value, options) {
  let out = value;
  if (value === null) { return 'n/a'; }
  if (value === undefined) { return 'n/a'; }
  if (typeof value === 'string') {
    if (options.upper) { out = value.toUpperCase(); }
    else if (options.lower) { out = value.toLowerCase(); }
    else if (options.title) { out = value[0].toUpperCase() + value.slice(1); }
  } else if (typeof value === 'number') {
    if (options.currency === 'USD') { out = '$' + value; }
    else if (options.currency === 'EUR') { out = value + ' EUR'; }
    else if (options.currency === 'GBP') { out = value + ' GBP'; }
    else if (options.percent) { out = value * 100 + '%'; }
    else if (options.round && value > 1000) { out = Math.round(value / 1000) + 'k'; }
    else if (options.round && value > 1000000) { out = Math.round(value / 1000000) + 'm'; }
  } else if (Array.isArray(value)) {
    if (options.join && value.length > 0) { out = value.join(', '); }
    else if (options.count && value.length > 1) { out = value.length + ' items'; }
    else if (options.first && value.length > 0) { out = value[0]; }
  } else if (typeof value === 'object') {
    if (options.json || options.pretty) { out = JSON.stringify(value, null, options.pretty ? 2 : 0); }
    else if (options.keys && Object.keys(value).length > 0) { out = Object.keys(value).join(', '); }
  }
  switch (options.wrap) {
    case 'paren': out = '(' + out + ')'; break;
    case 'bracket': out = '[' + out + ']'; break;
    case 'brace': out = '{' + out + '}'; break;
    case 'quote': out = '"' + out + '"'; break;
    default: break;
  }
  if (options.pad && String(out).length < options.pad) { out = String(out).padStart(options.pad); }
  return out;
}

export function summariseTotals(items) {
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
