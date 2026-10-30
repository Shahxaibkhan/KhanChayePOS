import { listOrdersWithItems } from "@/lib/data/orders";
import { listItems } from "@/lib/data/items";
import { listClients } from "@/lib/data/clients";
import { todayISO } from "@/lib/date";
import OrdersClient from "./OrdersClient";

export default async function TodaysOrdersPage() {
  const today = todayISO();
  const [orders, items, clients] = await Promise.all([
    listOrdersWithItems({ from: today, to: today }),
    listItems(),
    listClients(),
  ]);
  return <OrdersClient orders={orders} items={items} clients={clients} />;
}
