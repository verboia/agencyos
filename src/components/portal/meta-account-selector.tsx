"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { confirmMetaAccountSelection } from "@/app/portal/[token]/connect/meta/select/actions";

interface Account {
  id: string;
  external_account_id: string;
  external_account_name: string;
  business_name: string | null;
  currency: string | null;
}

export function MetaAccountSelector({
  token,
  accounts,
}: {
  token: string;
  accounts: Account[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function toggle(externalId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(externalId)) next.delete(externalId);
      else next.add(externalId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === accounts.length) return new Set();
      return new Set(accounts.map((a) => a.external_account_id));
    });
  }

  function submit() {
    if (selected.size === 0) {
      toast({ title: "Selecione ao menos uma conta", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      try {
        await confirmMetaAccountSelection(token, Array.from(selected));
      } catch (err) {
        toast({
          title: "Erro ao salvar seleção",
          description: String(err),
          variant: "destructive",
        });
      }
    });
  }

  const allSelected = selected.size === accounts.length && accounts.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4"
          />
          <span>{allSelected ? "Desmarcar todas" : "Selecionar todas"}</span>
        </label>
        <span className="text-xs text-slate-500">
          {selected.size} de {accounts.length} selecionada{selected.size === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-2">
        {accounts.map((account) => {
          const isChecked = selected.has(account.external_account_id);
          return (
            <label
              key={account.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                isChecked
                  ? "border-[#1877f2] bg-blue-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(account.external_account_id)}
                className="h-4 w-4 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {account.external_account_name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  ID: {account.external_account_id}
                  {account.currency && ` · ${account.currency}`}
                </div>
                {account.business_name && (
                  <div className="text-xs text-slate-500">
                    Business Manager: {account.business_name}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          onClick={() => setSelected(new Set())}
          disabled={pending || selected.size === 0}
        >
          Limpar
        </Button>
        <Button
          onClick={submit}
          disabled={pending || selected.size === 0}
          className="flex-1 bg-[#1877f2] hover:bg-[#1877f2]/90"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
            </>
          ) : (
            `Vincular ${selected.size} conta${selected.size === 1 ? "" : "s"}`
          )}
        </Button>
      </div>
    </div>
  );
}
