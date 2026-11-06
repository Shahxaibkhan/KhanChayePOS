import { isLow, listIngredients, listMovements, listRecipes } from "@/lib/data/inventory";
import { listItems } from "@/lib/data/items";
import StockList from "@/components/StockList";
import RecipeList from "@/components/RecipeList";
import StockHistory from "@/components/StockHistory";

export default async function AdminInventoryPage() {
  const [ingredients, recipes, items, movements] = await Promise.all([
    listIngredients(),
    listRecipes(),
    listItems(),
    listMovements(30),
  ]);
  const low = ingredients.filter(isLow);

  return (
    <div className="px-5 sm:px-8 py-8 max-w-3xl mx-auto">
      <h1 className="font-display text-xl tracking-wide mb-2">Inventory</h1>
      <p className="text-kc-muted text-sm mb-7">
        Stock goes down automatically with every order (by each item&apos;s recipe below) and comes back if an
        order is voided. Record deliveries with <b>+ Delivery</b>, and use <b>Count</b> now and then to match what&apos;s
        really on the shelf.
        {low.length > 0 && <span className="text-kc-red"> {low.length} item(s) need refilling.</span>}
      </p>

      {ingredients.length === 0 && (
        <p className="rounded-2xl bg-kc-red/10 text-kc-red text-sm px-5 py-4 mb-6">
          No ingredients yet. If you haven&apos;t already, run <code>sql/008_inventory.sql</code> in the Supabase SQL
          editor — it creates the inventory tables with starter ingredients and recipes.
        </p>
      )}

      <section className="mb-12">
        <h2 className="font-display text-sm tracking-wide text-kc-muted mb-4">STOCK</h2>
        <StockList ingredients={ingredients} canManage />
      </section>

      <section className="mb-12">
        <h2 className="font-display text-sm tracking-wide text-kc-muted mb-1">RECIPES</h2>
        <p className="text-xs text-kc-muted mb-4">
          Starter amounts are estimates (e.g. 1 kg milk ≈ 5 regular cups) — adjust them to how your kitchen really works.
        </p>
        <RecipeList items={items} ingredients={ingredients} recipes={recipes} />
      </section>

      <section>
        <h2 className="font-display text-sm tracking-wide text-kc-muted mb-4">RECENT DELIVERIES &amp; COUNTS</h2>
        <StockHistory movements={movements} />
      </section>
    </div>
  );
}
