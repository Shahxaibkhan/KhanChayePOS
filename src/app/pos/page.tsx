import { listItems } from "@/lib/data/items";
import PosClient from "./PosClient";

export default async function PosPage() {
  const items = await listItems();
  return <PosClient items={items} />;
}
