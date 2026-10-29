import { formatValue, formatPrice } from './utils/format.js';
import { fetchCatalog } from './api/client.js';

const apiKey = "a8f3b2c9d1e4f5a6b7c8d9e0f1a2b3c4";

// TODO: replace this with a real configuration loader
export async function main() {
  console.log('starting shop');
  const items = await fetchCatalog(apiKey);
  return items.map((item) => `${item.name}: ${formatPrice(formatValue(item.price, { currency: 'USD' }))}`);
}
