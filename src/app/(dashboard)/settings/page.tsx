import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Receipt,
  MessageCircle,
  BrainCircuit,
  Users,
  Target,
  Search,
  Music2,
} from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Integrações e preferências da agência.</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Organização</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link href="/settings/team">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Equipe
                </CardTitle>
                <CardDescription>Adicione administradores e operadores.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/settings/billing">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Cobrança (Asaas)
                </CardTitle>
                <CardDescription>API key, régua de cobrança e padrões.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/settings/whatsapp">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> WhatsApp (Meta Cloud API)
                </CardTitle>
                <CardDescription>Credenciais oficiais da Meta para envio de templates HSM.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/settings/ai">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4" /> Análise por IA
                </CardTitle>
                <CardDescription>Configurações do Claude para insights.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">
          Plataformas de anúncios
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/settings/meta-ads">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" /> Meta Ads
                </CardTitle>
                <CardDescription>OAuth de contas de anúncios via Graph API.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/settings/google-ads">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" /> Google Ads
                </CardTitle>
                <CardDescription>OAuth + MCC (aguardando Developer Token).</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/settings/tiktok-ads">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Music2 className="h-4 w-4" /> TikTok Ads
                </CardTitle>
                <CardDescription>OAuth via TikTok Marketing API (em breve).</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
