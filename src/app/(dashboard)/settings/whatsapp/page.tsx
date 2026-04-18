import Link from "next/link";
import { randomBytes } from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { saveMetaWhatsappConfig } from "./actions";

export default async function WhatsAppSettingsPage() {
  const supabase = await createServerClient();
  const { data: config } = await supabase.from("meta_whatsapp_config").select("*").limit(1).maybeSingle();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://seu-dominio.com";
  const webhookUrl = `${appUrl}/api/webhooks/meta-whatsapp`;
  const suggestedVerifyToken = config?.webhook_verify_token ?? randomBytes(24).toString("hex");

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">WhatsApp (Meta Cloud API)</h1>
          <p className="text-sm text-muted-foreground">
            Conecte sua conta oficial do WhatsApp Business via API da Meta.
          </p>
        </div>
      </div>

      {!config?.access_token && (
        <Alert>
          <AlertDescription>
            Sem credenciais, disparos de WhatsApp rodam em modo mock: o evento é registrado mas nenhuma mensagem real é enviada.
          </AlertDescription>
        </Alert>
      )}

      <form action={saveMetaWhatsappConfig}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credenciais Meta</CardTitle>
            <CardDescription>
              Obtenha esses valores em{" "}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                Meta for Developers <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → App → WhatsApp → API Setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Phone Number ID *</Label>
              <Input
                name="phone_number_id"
                defaultValue={config?.phone_number_id ?? ""}
                placeholder="123456789012345"
                required
              />
              <p className="text-xs text-muted-foreground">
                ID numérico do número de telefone do WhatsApp Business.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp Business Account ID (WABA) *</Label>
              <Input
                name="business_account_id"
                defaultValue={config?.business_account_id ?? ""}
                placeholder="987654321098765"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Access Token (System User, permanente) *</Label>
              <Input
                name="access_token"
                type="password"
                defaultValue={config?.access_token ?? ""}
                placeholder="EAAG..."
                required
              />
              <p className="text-xs text-muted-foreground">
                Gere um System User com permissão <code>whatsapp_business_messaging</code> para evitar expiração.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>App Secret</Label>
              <Input
                name="app_secret"
                type="password"
                defaultValue={config?.app_secret ?? ""}
                placeholder="usado para validar a assinatura dos webhooks"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Número de telefone (exibição)</Label>
              <Input
                name="display_phone_number"
                defaultValue={config?.display_phone_number ?? ""}
                placeholder="+55 67 99141-8064"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Webhook</CardTitle>
            <CardDescription>
              No painel da Meta, em WhatsApp → Configuration → Webhooks, cole a URL e o token abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Callback URL</Label>
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label>Verify Token *</Label>
              <Input
                name="webhook_verify_token"
                defaultValue={suggestedVerifyToken}
                required
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Use o mesmo valor aqui e no campo &quot;Verify Token&quot; do painel da Meta.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </div>
  );
}
