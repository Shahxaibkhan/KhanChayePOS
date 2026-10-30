import { listClients } from "@/lib/data/clients";
import ClientsClient from "./ClientsClient";

export default async function AdminClientsPage() {
  const clients = await listClients();
  return <ClientsClient clients={clients} />;
}
