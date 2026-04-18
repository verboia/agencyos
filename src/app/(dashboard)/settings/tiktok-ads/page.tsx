import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Info } from "lucide-react";

export default function TikTokAdsSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">TikTok Ads</h1>
          <p className="text-sm text-muted-foreground">
            Integração com TikTok Ads via OAuth (Marketing API).
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Aguardando registro do App.</strong> É necessário registrar um App no TikTok for
          Business Developer Portal e obter aprovação de acesso à Marketing API (alguns dias). Esta
          tela será habilitada após o registro.
        </AlertDescription>
      </Alert>

      <Card className="opacity-60 pointer-events-none">
        <CardHeader>
          <CardTitle className="text-base">Credenciais (em breve)</CardTitle>
          <CardDescription>App ID, App Secret e Business Center ID.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>Etapas necessárias:</div>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>
              Registrar app em <span className="font-mono">business-api.tiktok.com</span>
            </li>
            <li>Solicitar permissão de acesso à Marketing API</li>
            <li>Configurar Redirect URI de OAuth</li>
            <li>Criar Business Center para agrupar contas de anúncios de clientes</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
