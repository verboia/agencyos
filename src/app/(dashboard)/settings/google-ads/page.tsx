import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Info } from "lucide-react";

export default function GoogleAdsSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Google Ads</h1>
          <p className="text-sm text-muted-foreground">
            Integração com Google Ads via OAuth + Manager Account (MCC).
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Aguardando Developer Token.</strong> O Google Ads exige aprovação formal de um
          Developer Token para uso em produção (leva 2-4 semanas após submissão). Esta tela será
          habilitada assim que o token for aprovado.
        </AlertDescription>
      </Alert>

      <Card className="opacity-60 pointer-events-none">
        <CardHeader>
          <CardTitle className="text-base">Credenciais (em breve)</CardTitle>
          <CardDescription>
            Developer Token, OAuth Client ID, Client Secret e Manager Account (MCC) ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>Etapas necessárias:</div>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>
              Criar projeto no{" "}
              <span className="font-mono">console.cloud.google.com</span> e ativar Google Ads API
            </li>
            <li>Gerar OAuth 2.0 Client ID (tipo Web Application)</li>
            <li>
              Criar Manager Account (MCC) em{" "}
              <span className="font-mono">ads.google.com</span>
            </li>
            <li>
              Solicitar Developer Token no painel da MCC → Tools → API Center (nível Basic Access
              primeiro, depois Standard)
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
