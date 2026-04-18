import { notFound } from "next/navigation";
import { getProposalByToken } from "@/lib/services/portal-auth";
import { ProposalPublicView } from "@/components/portal/proposal-public-view";
import { markProposalViewed } from "@/app/(dashboard)/proposals/actions";

export default async function PublicProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const proposal = await getProposalByToken(token);
  if (!proposal) notFound();

  await markProposalViewed(token).catch(() => null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-adria-light via-white to-slate-50">
      <ProposalPublicView proposal={proposal} token={token} />
    </div>
  );
}
