import { listItems } from "@/lib/data/items";
import { listClients } from "@/lib/data/clients";
import PosClient from "./PosClient";

export default async function PosPage() {
  const [items, clients] = await Promise.all([listItems(), listClients()]);
  return <PosClient items={items} clients={clients} />;
}
