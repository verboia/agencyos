"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send, MessageCircle, CheckCircle2 } from "lucide-react";
import {
  previewReport,
  previewBalanceAlert,
  sendClientReport,
  sendClientBalanceAlert,
  type SendPreview,
  type SendOutcome,
} from "@/app/(dashboard)/clients/[id]/whatsapp/actions";

type Mode = "report" | "balance_alert";

interface Props {
  clientId: string;
  mode: Mode;
  trigger: React.ReactNode;
  defaultDaysBack?: number; // só para mode=report
}

const PERIOD_OPTIONS = [
  { value: 1, label: "1 dia" },
  { value: 7, label: "7 dias" },
  { value: 14, label: "14 dias" },
  { value: 30, label: "30 dias" },
];

export function SendWhatsAppDialog({ clientId, mode, trigger, defaultDaysBack = 7 }: Props) {
  const [open, setOpen] = useState(false);
  const [daysBack, setDaysBack] = useState(defaultDaysBack);
  const [preview, setPreview] = useState<SendPreview | null>(null);
  const [loadingPreview, startPreview] = useTransition();
  const [sending, startSending] = useTransition();
  const { toast } = useToast();

  function reset() {
    setPreview(null);
  }

  function openAndPreview(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) reset();
    else loadPreview(daysBack);
  }

  function loadPreview(days: number) {
    setPreview(null);
    startPreview(async () => {
      try {
        const result =
          mode === "report"
            ? await previewReport(clientId, days)
            : await previewBalanceAlert(clientId);
        setPreview(result);
      } catch (err) {
        toast({
          title: "Erro ao gerar prévia",
          description: String(err).slice(0, 200),
          variant: "destructive",
        });
      }
    });
  }

  function handleDaysChange(days: number) {
    setDaysBack(days);
    loadPreview(days);
  }

  function send() {
    startSending(async () => {
      try {
        const outcome: SendOutcome =
          mode === "report"
            ? await sendClientReport(clientId, daysBack)
            : await sendClientBalanceAlert(clientId);

        if (outcome.total === 0) {
          toast({
            title: "Nenhum grupo elegível",
            description:
              mode === "balance_alert"
                ? "Nenhum grupo vinculado a este cliente está marcado para receber alertas de saldo."
                : "Nenhum grupo vinculado a este cliente.",
            variant: "destructive",
          });
          return;
        }

        const summary = `${outcome.sent}/${outcome.total} grupo${outcome.total === 1 ? "" : "s"}`;
        if (outcome.mock > 0) {
          toast({
            title: "Modo mock",
            description: `W-API não configurada. ${summary} simulado${outcome.total === 1 ? "" : "s"}.`,
          });
        } else if (outcome.failed > 0) {
          toast({
            title: `${outcome.failed} falha${outcome.failed === 1 ? "" : "s"} no envio`,
            description: `${summary} enviado${outcome.sent === 1 ? "" : "s"}. Veja os logs.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Mensagem enviada",
            description: `${summary} recebido${outcome.sent === 1 ? "" : "s"}.`,
          });
        }
        setOpen(false);
        reset();
      } catch (err) {
        toast({
          title: "Erro ao enviar",
          description: String(err).slice(0, 200),
          variant: "destructive",
        });
      }
    });
  }

  const title =
    mode === "report"
      ? "Enviar relatório no WhatsApp"
      : "Avisar saldo Meta Ads no WhatsApp";

  return (
    <>
      <span onClick={() => openAndPreview(true)} className="inline-flex">
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={openAndPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {mode === "report" && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Período:</span>
              <div className="flex gap-1.5">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleDaysChange(opt.value)}
                    disabled={loadingPreview || sending}
                    className={`px-2.5 py-1 text-xs rounded-md border ${
                      daysBack === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Pré-visualização da mensagem
              </div>
              {loadingPreview || !preview ? (
                <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Gerando prévia…
                </div>
              ) : (
                <div className="rounded-lg border bg-[#e5ddd5] p-3 max-h-[300px] overflow-auto">
                  <div className="bg-white rounded-lg p-3 max-w-[420px] shadow-sm">
                    <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-900">
                      {renderWhatsapp(preview.text)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">
                Grupos que vão receber ({preview?.groups.length ?? 0})
              </div>
              {!preview || preview.groups.length === 0 ? (
                <Alert>
                  <AlertDescription className="text-xs">
                    {mode === "balance_alert"
                      ? "Nenhum grupo vinculado está marcado para receber alertas de saldo. Vá em Configurações → WhatsApp e marque a flag \"Alertas de saldo\" no vínculo."
                      : "Nenhum grupo vinculado a este cliente. Vá em Configurações → WhatsApp para vincular grupos."}
                  </AlertDescription>
                </Alert>
              ) : (
                <ul className="space-y-1">
                  {preview.groups.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border border-slate-200"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-[#25d366] shrink-0" />
                      <span className="font-medium truncate">
                        {g.group_subject ?? g.group_id}
                      </span>
                      <span className="text-muted-foreground ml-auto shrink-0">
                        {g.purpose}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => openAndPreview(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button
              onClick={send}
              disabled={sending || loadingPreview || !preview || preview.groups.length === 0}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Enviar agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Renderiza markdown WhatsApp (*negrito*, _itálico_) numa string.
 * Aqui apenas devolve o texto cru — o preview é monospace e queremos mostrar
 * exatamente o que o WhatsApp vai receber. Asteriscos viram negrito visual no
 * próprio app do destinatário.
 */
function renderWhatsapp(text: string): string {
  return text;
}
