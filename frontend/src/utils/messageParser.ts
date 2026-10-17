import type { InventoryItem } from '../types';

export interface ParsedItemPreview {
  rawName: string;
  name: string;
  action: 'ADD' | 'SELL';
  qty: number;
  unit: string;
  currentStock: number;
  newStock: number;
  initials: string;
  avatarColor: string;
}

const FILLER_AND_ACTION_WORDS = new Set([
  'bhai', 'bhaiya', 'ji', 'sir', 'hai', 'hain', 'tha', 'thi', 'the', 'ho',
  'aaya', 'aaye', 'aayi', 'laya', 'laye', 'layi', 'laaya', 'laaye', 'kharida',
  'becha', 'beche', 'bechi', 'bik', 'gaya', 'gaye', 'gayi', 'diya', 'diye',
  'add', 'added', 'adds', 'sell', 'sold', 'sale', 'restock', 'stock', 'packet', 'packets',
  'pkt', 'pkts', 'kilo', 'kilos', 'kg', 'kgs', 'l', 'lt', 'liter', 'litre', 'pcs', 'aur', 'and'
]);

const COLOR_LIST = ['amber', 'blue', 'emerald', 'purple', 'teal', 'rose'];

export function parseInventoryMessage(
  text: string,
  inventory: InventoryItem[] = []
): { items: ParsedItemPreview[]; overallAction: 'ADD' | 'SELL' } {
  const raw = (text || '').trim();
  if (!raw) {
    return { items: [], overallAction: 'ADD' };
  }

  const lower = raw.toLowerCase();
  
  // Overall action detection
  const isGlobalSell = (
    lower.includes('sell') ||
    lower.includes('sold') ||
    lower.includes('becha') ||
    lower.includes('bik gaya') ||
    lower.includes('bik gaye') ||
    lower.includes('diya') ||
    lower.includes('sale') ||
    lower.includes('-')
  );
  const isGlobalAdd = (
    lower.includes('add') ||
    lower.includes('aaya') ||
    lower.includes('laya') ||
    lower.includes('kharida') ||
    lower.includes('restock') ||
    lower.includes('+')
  );

  const defaultAction: 'ADD' | 'SELL' = isGlobalSell && !isGlobalAdd ? 'SELL' : 'ADD';

  // Split into clauses
  const clauses = raw.split(/,|\n|\band\b|\baur\b|\bani\b/i);
  const items: ParsedItemPreview[] = [];

  clauses.forEach((clause, idx) => {
    const clauseTrimmed = clause.trim();
    if (!clauseTrimmed) return;

    const clauseLower = clauseTrimmed.toLowerCase();
    let action: 'ADD' | 'SELL' = defaultAction;
    if (clauseLower.includes('sell') || clauseLower.includes('sold') || clauseLower.includes('becha') || clauseLower.includes('bik')) {
      action = 'SELL';
    } else if (clauseLower.includes('add') || clauseLower.includes('aaya') || clauseLower.includes('laya') || clauseLower.includes('kharida')) {
      action = 'ADD';
    }

    // Extract quantity
    const numberMatch = clauseTrimmed.match(/(\d+(?:\.\d+)?)/);
    if (!numberMatch) return;
    const qty = parseFloat(numberMatch[1]);
    if (isNaN(qty) || qty <= 0) return;

    // Detect unit
    let detectedUnit = 'pcs';
    if (/(?:kg|kilo|kgs|kilogram)/i.test(clauseTrimmed)) detectedUnit = 'kg';
    else if (/(?:packet|packets|pkt|pkts)/i.test(clauseTrimmed)) detectedUnit = 'packets';
    else if (/(?:liter|litre|ltr|l\b)/i.test(clauseTrimmed)) detectedUnit = 'l';
    else if (/(?:box|boxes|dabba)/i.test(clauseTrimmed)) detectedUnit = 'box';
    else if (/(?:dozen|darjan)/i.test(clauseTrimmed)) detectedUnit = 'dozen';

    // Extract item name words
    const words = clauseTrimmed
      .replace(/(\d+(?:\.\d+)?)/g, ' ')
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0 && !FILLER_WORDS_SET(w.toLowerCase()));

    const cleanRawName = words.join(' ').trim();
    if (!cleanRawName) return;

    // Find in user's inventory
    const match = findBestInventoryMatch(cleanRawName, inventory);

    const displayName = match ? match.name : toTitleCase(cleanRawName);
    const currentStock = match ? match.qty : 0;
    const finalUnit = match ? match.unit : detectedUnit;
    const newStock = action === 'ADD' ? currentStock + qty : currentStock - qty;

    const initials = displayName
      .split(/\s+/)
      .map((w) => w[0] || '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'IT';

    const avatarColor = COLOR_LIST[(items.length + idx) % COLOR_LIST.length];

    items.push({
      rawName: cleanRawName,
      name: displayName,
      action,
      qty,
      unit: finalUnit,
      currentStock,
      newStock,
      initials,
      avatarColor
    });
  });

  return {
    items,
    overallAction: defaultAction
  };
}

function FILLER_WORDS_SET(word: string): boolean {
  return FILLER_AND_ACTION_WORDS.has(word);
}

function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function findBestInventoryMatch(
  search: string,
  inventory: InventoryItem[]
): InventoryItem | undefined {
  const norm = search.toLowerCase();

  // 1. Exact match
  const exact = inventory.find((i) => i.name.toLowerCase() === norm);
  if (exact) return exact;

  // 2. Starts with / contains
  const starts = inventory.find(
    (i) => i.name.toLowerCase().startsWith(norm) || norm.startsWith(i.name.toLowerCase())
  );
  if (starts) return starts;

  const contains = inventory.find(
    (i) => i.name.toLowerCase().includes(norm) || norm.includes(i.name.toLowerCase())
  );
  if (contains) return contains;

  // 3. Token match
  const searchTokens = new Set(norm.split(' '));
  return inventory.find((i) => {
    const itemTokens = i.name.toLowerCase().split(' ');
    const common = itemTokens.filter((t) => searchTokens.has(t));
    return common.length >= 2 || (itemTokens.length === 1 && searchTokens.has(itemTokens[0]));
  });
}

