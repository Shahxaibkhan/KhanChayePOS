/** Stock quantity with its unit, e.g. "2.5 kg", "250 g", "12 pcs". */
export function formatQty(n: number, unit: string): string {
  return `${Number(n.toFixed(3)).toLocaleString("en-PK", { maximumFractionDigits: 3 })} ${unit}`;
}
