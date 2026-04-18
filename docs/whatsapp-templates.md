# Templates HSM — WhatsApp Business Cloud API

Este documento lista **todos os templates** que precisam ser criados e aprovados no **Meta Business Manager** (WhatsApp Manager → Message Templates) para o AgencyOS operar em produção.

## Como criar cada template

1. Acesse [business.facebook.com](https://business.facebook.com) → **WhatsApp Manager** → **Message Templates**
2. Clique em **Create Template**
3. Preencha os campos exatamente como especificado abaixo (Name, Category, Language, Body, Footer, Buttons)
4. Envie para aprovação — leva de 1h a 48h
5. Depois de aprovado, o template fica disponível para envio via API pelo nome (ex: `billing_invoice_created`)

## Regras importantes

- **Idioma:** todos em `pt_BR` (Portuguese - BR)
- **Placeholders:** use `{{1}}`, `{{2}}`, etc. — a Meta exige exemplos de valores ao submeter
- **Categoria:**
  - `UTILITY` — cobrança, confirmação, lembrete (mais barato, aprova mais fácil)
  - `MARKETING` — propostas, conteúdo promocional (mais caro, restrições maiores)
  - `AUTHENTICATION` — códigos OTP (não usamos aqui)
- Evite linguagem promocional em templates UTILITY (sem "oferta", "desconto", "aproveite")
- Nunca incluir dados sensíveis (CPF completo, senha) nos placeholders

---

## 1. Billing (prioridade máxima — régua de cobrança)

### 1.1 `billing_invoice_created`

- **Categoria:** UTILITY
- **Idioma:** pt_BR
- **Body:**
  ```
  Olá, {{1}}! Sua fatura {{2}} foi gerada.

  Valor: {{3}}
  Vencimento: {{4}}

  Acesse o portal para pagar via PIX, boleto ou cartão: {{5}}
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=FAT-2026-0412`, `{{3}}=R$ 1.500,00`, `{{4}}=25/04/2026`, `{{5}}=https://adria.app/portal/abc123/billing`
- **Quando dispara:** webhook Asaas `PAYMENT_CREATED`
- **Footer (opcional):** `Adria · Tráfego Pago + IA`

### 1.2 `billing_reminder_3d`

- **Categoria:** UTILITY
- **Body:**
  ```
  Oi, {{1}}! Lembrete amigável: sua fatura de {{2}} vence em 3 dias ({{3}}).

  Pague agora pelo portal: {{4}}
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=R$ 1.500,00`, `{{3}}=25/04/2026`, `{{4}}=https://adria.app/portal/abc123/billing`
- **Quando dispara:** cron diário, 3 dias antes do vencimento

### 1.3 `billing_reminder_due_today`

- **Categoria:** UTILITY
- **Body:**
  ```
  Oi, {{1}}. Sua fatura de {{2}} vence hoje.

  Para evitar juros, pague por aqui: {{3}}
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=R$ 1.500,00`, `{{3}}=https://adria.app/portal/abc123/billing`
- **Quando dispara:** cron diário, no dia do vencimento

### 1.4 `billing_overdue_1d`

- **Categoria:** UTILITY
- **Body:**
  ```
  Olá, {{1}}. Identificamos que a fatura {{2}} ({{3}}) venceu ontem.

  Se já pagou, ignore esta mensagem. Caso contrário, regularize pelo portal: {{4}}
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=FAT-2026-0412`, `{{3}}=R$ 1.500,00`, `{{4}}=https://adria.app/portal/abc123/billing`
- **Quando dispara:** cron diário, 1 dia após vencimento

### 1.5 `billing_overdue_5d`

- **Categoria:** UTILITY
- **Body:**
  ```
  Oi, {{1}}. A fatura {{2}} está em aberto há 5 dias.

  Valor com juros e multa: {{3}}
  Pague aqui: {{4}}

  Qualquer dúvida, só responder.
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=FAT-2026-0412`, `{{3}}=R$ 1.527,50`, `{{4}}=https://adria.app/portal/abc123/billing`
- **Quando dispara:** cron diário, 5 dias após vencimento

### 1.6 `billing_overdue_10d`

- **Categoria:** UTILITY
- **Body:**
  ```
  Oi, {{1}}. A fatura {{2}} ({{3}}) segue em aberto há 10 dias.

  Conforme contrato, o serviço será pausado em {{4}} caso não haja regularização. Evite interrupção: {{5}}
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=FAT-2026-0412`, `{{3}}=R$ 1.527,50`, `{{4}}=02/05/2026`, `{{5}}=https://adria.app/portal/abc123/billing`
- **Quando dispara:** cron diário, 10 dias após vencimento

### 1.7 `billing_payment_confirmed`

- **Categoria:** UTILITY
- **Body:**
  ```
  Recebido, {{1}}! Pagamento de {{2}} confirmado em {{3}}.

  Obrigado pela parceria — seguimos firmes com sua operação. 🚀
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=R$ 1.500,00`, `{{3}}=25/04/2026`
- **Quando dispara:** webhook Asaas `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED`

### 1.8 `billing_subscription_paused`

- **Categoria:** UTILITY
- **Body:**
  ```
  Olá, {{1}}. Conforme contrato, sua operação foi pausada por inadimplência da fatura {{2}}.

  Regularize pelo portal para reativar imediatamente: {{3}}
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=FAT-2026-0412`, `{{3}}=https://adria.app/portal/abc123/billing`
- **Quando dispara:** quando `client.status` é alterado para `paused` via régua de cobrança (15 dias)

---

## 2. Contratos

### 2.1 `contract_sent`

- **Categoria:** UTILITY
- **Body:**
  ```
  Olá, {{1}}! Seu contrato da Adria está pronto para assinatura digital.

  Acesse aqui para revisar e assinar: {{2}}

  Qualquer dúvida, só responder.
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=https://adria.app/portal/abc123/contract`
- **Quando dispara:** quando admin envia contrato via painel

### 2.2 `contract_signed`

- **Categoria:** UTILITY
- **Body:**
  ```
  Contrato {{1}} assinado com sucesso, {{2}}!

  Agora é com a gente: nosso time já iniciou o setup da sua operação. Em seguida enviaremos o briefing.
  ```
- **Exemplos:** `{{1}}=CT-2026-008`, `{{2}}=Lucas`
- **Quando dispara:** server action `acceptContract` (após assinatura no portal)

---

## 3. Propostas Comerciais

### 3.1 `proposal_sent`

- **Categoria:** MARKETING
- **Body:**
  ```
  Olá, {{1}}! Como combinado, preparei uma proposta sob medida para a {{2}}.

  Dá uma olhada com calma: {{3}}

  Qualquer ajuste ou dúvida, só responder por aqui.
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=Oficina do Lucas`, `{{3}}=https://adria.app/portal/proposta/xyz789`
- **Quando dispara:** admin clica em "Enviar proposta" no painel

### 3.2 `proposal_followup`

- **Categoria:** MARKETING
- **Body:**
  ```
  Oi, {{1}}! Passando pra saber se conseguiu dar uma olhada na proposta que te mandei.

  Se quiser que eu revise algum ponto ou ajuste os valores, é só avisar: {{2}}
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=https://adria.app/portal/proposta/xyz789`
- **Quando dispara:** cron, 3 dias após envio sem aceite/recusa

---

## 4. Onboarding e Briefing

### 4.1 `onboarding_welcome`

- **Categoria:** UTILITY
- **Body:**
  ```
  Bem-vindo(a) à Adria, {{1}}! 🎉

  Aqui é seu canal direto comigo. Para começarmos o setup, preciso que você preencha o briefing no seu portal: {{2}}

  Qualquer dúvida, só chamar.
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=https://adria.app/portal/abc123/briefing`
- **Quando dispara:** após assinatura do contrato (junto com `contract_signed` ou depois)

### 4.2 `briefing_pending`

- **Categoria:** UTILITY
- **Body:**
  ```
  Oi, {{1}}! Só lembrando que seu briefing ainda está pendente.

  Ele é essencial pra gente começar as campanhas no prazo. Leva uns 10 minutos: {{2}}
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=https://adria.app/portal/abc123/briefing`
- **Quando dispara:** cron, 2 dias após contrato assinado se `briefing_submitted_at` for null

---

## 5. Relatórios

### 5.1 `monthly_report_published`

- **Categoria:** UTILITY
- **Body:**
  ```
  Oi, {{1}}! O relatório de {{2}} da {{3}} está pronto.

  Principais números: {{4}}

  Relatório completo: {{5}}
  ```
- **Exemplos:** `{{1}}=Lucas`, `{{2}}=Abril/2026`, `{{3}}=Oficina do Lucas`, `{{4}}=127 leads · CPL R$ 42,18`, `{{5}}=https://adria.app/portal/abc123/reports/0425`
- **Quando dispara:** quando admin publica um relatório (status = `published`)

---

## Resumo — checklist de criação

| # | Nome do template | Categoria | Prioridade |
|---|---|---|---|
| 1 | `billing_invoice_created` | UTILITY | 🔴 Alta |
| 2 | `billing_reminder_3d` | UTILITY | 🔴 Alta |
| 3 | `billing_reminder_due_today` | UTILITY | 🔴 Alta |
| 4 | `billing_overdue_1d` | UTILITY | 🔴 Alta |
| 5 | `billing_overdue_5d` | UTILITY | 🔴 Alta |
| 6 | `billing_overdue_10d` | UTILITY | 🔴 Alta |
| 7 | `billing_payment_confirmed` | UTILITY | 🔴 Alta |
| 8 | `billing_subscription_paused` | UTILITY | 🟡 Média |
| 9 | `contract_sent` | UTILITY | 🟡 Média |
| 10 | `contract_signed` | UTILITY | 🟡 Média |
| 11 | `proposal_sent` | MARKETING | 🟡 Média |
| 12 | `proposal_followup` | MARKETING | 🟢 Baixa |
| 13 | `onboarding_welcome` | UTILITY | 🟡 Média |
| 14 | `briefing_pending` | UTILITY | 🟢 Baixa |
| 15 | `monthly_report_published` | UTILITY | 🟡 Média |

**Recomendação:** submeta os 8 templates de billing primeiro — são o bloqueador para ligar a régua de cobrança em produção. Os outros podem ir em paralelo enquanto os primeiros são aprovados.

---

## Dica final — categorização

A Meta analisa o texto e pode **recategorizar** um template de UTILITY para MARKETING (mais caro) se achar que tem apelo promocional. Para evitar:

- Não use palavras como "oferta", "promoção", "desconto", "aproveite", "garanta", "exclusivo" em templates de billing/onboarding
- Mantenha o tom transacional: informar algo que aconteceu ou está para acontecer
- Incluir o link do portal é OK — é considerado utilitário quando aponta para ação do usuário sobre algo dele mesmo (fatura, contrato, briefing)
