import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isPreviewMode } from "@/lib/preview";

export default async function HomePage() {
  if (isPreviewMode()) redirect("/dashboard/sales");
  const session = await getServerSession(authOptions);
  redirect(session ? "/dashboard/sales" : "/login");
}
