import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentUser } from "@/lib/services/current-user";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <Sidebar profile={session.profile} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header profile={session.profile} />
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-x-hidden">{children}</main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
