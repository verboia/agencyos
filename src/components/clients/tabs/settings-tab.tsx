"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateClient } from "@/app/(dashboard)/clients/actions";
import { useToast } from "@/components/ui/use-toast";
import type { Client } from "@/types/database";

export function ClientSettingsTab({ client }: { client: Client }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(client.status);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    formData.set("status", status);
    const result = await updateClient(client.id, formData);
    if (result && "error" in result && result.error) {
      setError(result.error);
    } else {
      toast({ title: "Configurações salvas" });
    }
    setSaving(false);
  }

  return (
    <form action={handleSubmit}>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status do cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Status atual</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="churned">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meta Ads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="meta_ad_account_id">Ad Account ID</Label>
              <Input
                id="meta_ad_account_id"
                name="meta_ad_account_id"
                defaultValue={client.meta_ad_account_id ?? ""}
                placeholder="act_123456789"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meta_pixel_id">Pixel ID</Label>
              <Input
                id="meta_pixel_id"
                name="meta_pixel_id"
                defaultValue={client.meta_pixel_id ?? ""}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end mt-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
