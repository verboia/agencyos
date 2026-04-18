import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isAnthropicConfigured } from "@/lib/anthropic/client";

export default function AiSettingsPage() {
  const configured = isAnthropicConfigured();
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Análise por IA</h1>
          <p className="text-sm text-muted-foreground">Claude gera resumos e insights nos relatórios.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          {configured ? (
            <Alert>
              <AlertDescription>Chave da Anthropic detectada. Análises reais estão ativas.</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                <code>ANTHROPIC_API_KEY</code> não configurada. A análise atual roda em modo mock.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
