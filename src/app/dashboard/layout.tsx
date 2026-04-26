import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NavBar } from "@/components/nav-bar";
import { DesktopOnlyGuard } from "@/components/desktop-only";
import { isPreviewMode } from "@/lib/preview";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isPreviewMode()) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");
  }

  return (
    <>
      <DesktopOnlyGuard />
      <div className="hidden lg:block">
        <NavBar lastSyncedLabel="2h ago" />
        <main className="mx-auto max-w-[1440px] px-6 py-8">{children}</main>
      </div>
    </>
  );
}
