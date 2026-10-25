import { listWastage } from "@/lib/data/wastage";
import { listItems } from "@/lib/data/items";
import { daysAgoISO, todayISO } from "@/lib/date";
import WastageClient from "./WastageClient";

export default async function AdminWastagePage() {
  const [wastage, items] = await Promise.all([
    listWastage({ from: daysAgoISO(90), to: todayISO() }),
    listItems({ includeInactive: true }),
  ]);
  return <WastageClient wastage={wastage} items={items} />;
}
