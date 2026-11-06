import { isLow, listIngredients, listMovements } from "@/lib/data/inventory";
import StockList from "@/components/StockList";
import StockHistory from "@/components/StockHistory";

export default async function PosStockPage() {
  const [ingredients, movements] = await Promise.all([listIngredients(), listMovements(15)]);
  const low = ingredients.filter(isLow);

  return (
    <div className="flex-1 px-5 sm:px-8 py-8 max-w-3xl w-full mx-auto">
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <h1 className="font-display text-xl tracking-wide">Stock</h1>
        {low.length > 0 && <span className="text-sm text-kc-red font-semibold">{low.length} to refill</span>}
      </div>
      <p className="text-kc-muted text-sm mb-7">
        Goes down automatically with each order. Tap <b>+ Delivery</b> when stock arrives, or <b>Count</b> to set
        what&apos;s actually on the shelf.
      </p>
      <StockList ingredients={ingredients} />
      <h2 className="font-display text-sm tracking-wide text-kc-muted mt-10 mb-4">RECENT DELIVERIES &amp; COUNTS</h2>
      <StockHistory movements={movements} />
    </div>
  );
}
