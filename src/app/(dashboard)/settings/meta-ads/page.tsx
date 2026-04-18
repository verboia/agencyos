import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { saveMetaAdsConfig } from "./actions";
import { APP_URL } from "@/lib/utils/constants";

export default async function MetaAdsSettingsPage() {
  const supabase = await createServerClient();
  const { data: config } = await supabase
    .from("ad_platform_configs")
    .select("*")
    .eq("platform", "meta")
    .maybeSingle();

  const redirectUri = `${APP_URL}/api/integrations/meta/callback`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meta Ads</h1>
          <p className="text-sm text-muted-foreground">
            Credenciais do App para que clientes conectem suas contas de anúncios via OAuth.
          </p>
        </div>
      </div>

      {!config?.is_active && (
        <Alert>
          <AlertDescription>
            Após salvar, marque &quot;Ativar integração&quot; para liberar o botão &quot;Conectar Meta&quot;
            no portal de onboarding dos clientes.
          </AlertDescription>
        </Alert>
      )}

      <form action={saveMetaAdsConfig}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credenciais do App Meta</CardTitle>
            <CardDescription>
              Obtenha em{" "}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                Meta for Developers <ExternalLink className="h-3 w-3" />
              </a>{" "}
              → seu App → Settings → Basic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>App ID *</Label>
              <Input
                name="app_id"
                defaultValue={config?.app_id ?? ""}
                placeholder="123456789012345"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>App Secret *</Label>
              <Input
                name="app_secret"
                type="password"
                defaultValue={config?.app_secret ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Versão da Graph API</Label>
              <Input
                name="api_version"
                defaultValue={config?.api_version ?? "v21.0"}
                placeholder="v21.0"
              />
            </div>
            <label className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={config?.is_active ?? false}
                className="h-4 w-4"
              />
              <span className="text-sm">Ativar integração</span>
            </label>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">OAuth Redirect URI</CardTitle>
            <CardDescription>
              Cole esta URL em Meta for Developers → seu App → Facebook Login for Business →
              Settings → Valid OAuth Redirect URIs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input value={redirectUri} readOnly className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">
              Escopos solicitados: <code>ads_read</code>, <code>ads_management</code>,{" "}
              <code>business_management</code>, <code>read_insights</code>.
            </p>
          </CardContent>
        </Card>

        <div className="mt-4 flex justify-end">
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </div>
  );
}
