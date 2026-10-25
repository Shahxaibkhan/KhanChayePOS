import { listOrdersWithItems } from "@/lib/data/orders";
import { listItems } from "@/lib/data/items";
import { todayISO } from "@/lib/date";
import OrdersClient from "./OrdersClient";

export default async function TodaysOrdersPage() {
  const today = todayISO();
  const [orders, items] = await Promise.all([
    listOrdersWithItems({ from: today, to: today }),
    listItems(),
  ]);
  return <OrdersClient orders={orders} items={items} />;
}
