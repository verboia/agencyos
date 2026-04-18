import { PortalHeader } from "@/components/portal/portal-header";
import { requireClientByToken } from "@/lib/services/portal-auth";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const client = await requireClientByToken(token);

  return (
    <div className="min-h-screen bg-gradient-to-b from-adria-light to-white text-slate-900">
      <PortalHeader clientName={client.company_name} token={token} />
      <main className="max-w-3xl mx-auto px-4 py-6 md:py-10">{children}</main>
      <footer className="text-center py-6 text-xs text-slate-500">
        Portal Adria · Feito para você acompanhar sua estratégia
      </footer>
    </div>
  );
}
