import type { Item } from "@/lib/types";

// Items named "X (Regular)" / "X (Large)" are rendered as one row with two
// price buttons, instead of two near-identical rows — halves how much a
// category like Chaye looks like at a glance without changing the data model
// (each size is still its own `items` row under the hood).
const VARIANT_PATTERN = /^(.*) \((Regular|Large)\)$/;

export type DisplayRow =
  | { kind: "single"; item: Item; sortKey: number }
  | { kind: "variant"; baseName: string; variants: { label: string; item: Item }[]; sortKey: number };

export function groupItemsForDisplay(items: Item[]): DisplayRow[] {
  const groups = new Map<string, { baseName: string; sortKey: number; variants: { label: string; item: Item }[] }>();
  const singles: Item[] = [];

  for (const item of items) {
    const match = item.name.match(VARIANT_PATTERN);
    if (match) {
      const [, base, size] = match;
      const key = `${item.category}::${base}`;
      const group = groups.get(key) ?? { baseName: base, sortKey: item.sort_order, variants: [] };
      group.variants.push({ label: size, item });
      group.sortKey = Math.min(group.sortKey, item.sort_order);
      groups.set(key, group);
    } else {
      singles.push(item);
    }
  }

  const rows: DisplayRow[] = [];
  for (const g of groups.values()) {
    g.variants.sort((a, b) => (a.label === "Regular" ? -1 : 1));
    rows.push({ kind: "variant", baseName: g.baseName, variants: g.variants, sortKey: g.sortKey });
  }
  for (const item of singles) {
    rows.push({ kind: "single", item, sortKey: item.sort_order });
  }

  rows.sort((a, b) => a.sortKey - b.sortKey);
  return rows;
}
