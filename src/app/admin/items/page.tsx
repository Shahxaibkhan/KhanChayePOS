import { listItems } from "@/lib/data/items";
import ItemsClient from "./ItemsClient";

export default async function AdminItemsPage() {
  const items = await listItems({ includeInactive: true });
  return <ItemsClient items={items} />;
}
