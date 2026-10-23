import { redirect } from "next/navigation";
import { getRole } from "@/lib/session";

export default async function Home() {
  const role = await getRole();
  if (role === "admin") redirect("/admin");
  if (role === "staff") redirect("/pos");
  redirect("/login");
}
