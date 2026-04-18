# TODO — AgencyOS by Adria

Checklist de implementação baseado no PRD. Execução unificada: **Fase 1, 2 e 3 implementadas** com integrações externas em modo mock quando sem API key.

---

## FASE 1 — CORE (Semanas 1-5)

### Semana 1: Fundação ✅

- [x] Projeto Next.js 14 + TypeScript + Tailwind + App Router
- [x] Dependências: Supabase SSR, shadcn/ui (Radix), React Hook Form, Zod, hello-pangea/dnd, date-fns, recharts, react-pdf
- [x] Tema dark (dashboard) + light (portal) com CSS variables e fonte Inter
- [x] 25 componentes shadcn/ui em `src/components/ui/`
- [x] `.env.local.example`, `next.config.js`, `tsconfig.json`, `components.json`
- [x] Clients Supabase: browser, server, admin, middleware
- [x] `middleware.ts` com proteção de rotas
- [x] Types do schema em `src/types/database.ts`
- [x] Migrações SQL: `001_initial_schema.sql`, `002_rls_policies.sql`, `003_seed_data.sql`, `004_triggers.sql`
- [x] Seed: org Adria, catálogo com 9 serviços, 3 pacotes, 25+ templates de tarefas
- [x] Utils: `cn`, `format` (moeda/data/telefone/doc/CEP BR), `validators` (CPF/CNPJ/CEP), `constants`, `contract-clauses`
- [x] Autenticação: `(auth)/login` + server actions (signIn/signOut)
- [x] Layout dashboard: sidebar + header + mobile-nav + user-menu + notifications-bell (com Realtime)
- [x] CRUD Clientes: listagem, cadastro, detalhes com 8 abas
- [x] Dashboard home: stats cards + admin-dashboard + operator-dashboard

### Semana 2: Motor de Tarefas + Contratos ✅

- [x] Kanban com drag-and-drop (4 colunas, filtros por responsável/categoria/prioridade/cliente)
- [x] Geração automática de tarefas de onboarding ao criar cliente
- [x] Trigger SQL: recalcula `onboarding_progress` e ativa cliente ao 100%
- [x] Aba de tarefas por cliente (kanban filtrado)
- [x] CRUD Catálogo de Serviços (dialog de criar/editar, cláusulas JSON)
- [x] Página de Pacotes
- [x] Contract Builder completo (seleção de pacote, serviços com preço editável, termos, implementação, cláusulas customizadas)
- [x] Geração automática de `contract_number` (ADRIA-YYYY-NNN)
- [x] Montagem de cláusulas (gerais + por serviço + custom) com variáveis
- [x] Página de detalhes do contrato com timeline de eventos

### Semana 3: Portal + Propostas ✅

- [x] Portal público com layout light, header, navegação por abas
- [x] Página inicial do portal com progresso de onboarding
- [x] Briefing step-by-step (6 etapas, auto-save entre passos)
- [x] Aceite de contrato: visualização → dados (CEP via ViaCEP) → assinatura digital → confirmação
- [x] Registro jurídico da assinatura (IP, user-agent, timestamp, consentimento)
- [x] Gerador de Propostas (narrativa + serviços + cases + condições)
- [x] Portal público de proposta com design animado
- [x] Conversão automática proposta → cliente + contrato + onboarding
- [x] Pipeline de propostas por status

### Semana 4: Cobrança + Financeiro ✅

- [x] Cliente Asaas (REST) + tipos + mock + webhooks handler
- [x] Helper `isAsaasConfigured()` — sistema roda em modo mock sem API key
- [x] Settings page para Asaas (API key, ambiente, régua, padrões)
- [x] Setup automático de billing ao assinar contrato (customer + subscription + cobrança de implementação)
- [x] Webhook `/api/webhooks/asaas` processa PAYMENT_*, SUBSCRIPTION_*
- [x] Dashboard financeiro: MRR, recebido, a receber, inadimplência, lista de cobranças
- [x] Cobrança avulsa via dialog
- [x] Aba financeiro no cliente + portal (QR PIX, copia-cola, histórico)
- [x] Forecast de receita: histórico 6m + projeção 3m, riscos, pipeline, churn
- [x] Cron `/api/cron/billing-dunning` (régua: marca overdue, lembretes, pausa automática)

### Semana 5: Assets + Relatórios + Dashboard ✅

- [x] Biblioteca de assets: upload multi-file para Supabase Storage, grid por categoria, tags, busca
- [x] Fluxo de aprovação: operador sobe com flag → cliente aprova/rejeita no portal
- [x] Upload de materiais pelo cliente (portal)
- [x] CRUD de Relatórios de Performance (criar, publicar, marcar enviado, editar)
- [x] Página de detalhes com ReportPublicViewer embutido
- [x] Página pública de relatório no portal do cliente
- [x] Dashboard admin com atenção necessária + atividades recentes
- [x] Dashboard operador com meu dia + minha semana + meus clientes
- [x] Notificações in-app com Supabase Realtime
- [x] Activity log disparado em todas as actions relevantes
- [x] Cron `/api/cron/weekly-tasks`, `monthly-tasks`, `overdue-tasks`

---

## FASE 2 — WhatsApp (Semana 6-7) ✅

- [x] Cliente Evolution API + mock + helper `isEvolutionConfigured()`
- [x] Settings page WhatsApp (URL, key, instância)
- [x] Criação automática de grupo WhatsApp ao cadastrar cliente (fire-and-forget)
- [x] Mensagem de boas-vindas com link do portal
- [x] Envio de relatórios via WhatsApp (botão na tela do relatório)
- [x] Régua de cobrança via WhatsApp (integrada no cron billing-dunning)
- [x] Cron `/api/cron/client-reminders` para briefing/contrato pendentes (dias 2, 3, 5)
- [x] Notificações automáticas (admin + cliente) com mensagem mock quando sem API

---

## FASE 3 — Inteligência + Performance (Semanas 8-10) ✅

- [x] Cliente Meta Marketing API (Graph v21.0)
- [x] Config Meta por cliente (aba Configurações do cliente)
- [x] Cron `/api/cron/meta-metrics` puxa insights e cria/atualiza relatório mensal
- [x] Cliente Anthropic Claude com `claude-sonnet-4-5` + mock
- [x] Serviço `generateReportAnalysis` + botão "Análise IA" no relatório
- [x] Settings page AI (status da chave)
- [x] Health Score: cálculo das 5 dimensões (financeiro, performance, engajamento, execução, satisfação)
- [x] Cron `/api/cron/health-scores` semanal + alertas quando muda de faixa
- [x] Componente `HealthScoreBadge`
- [x] Team Metrics: daily + monthly (tasks, SLA, clientes) via cron `/api/cron/team-metrics`
- [x] Página `/performance` com dashboard por operador
- [x] Forecast com churn prediction baseado em health score crítico
- [x] Settings hub (`/settings`) com links para billing, whatsapp, meta, ai

---

## Build ✅

- [x] `npm run build` passa com **28 rotas** compiladas sem erros
- [x] TypeScript `tsc --noEmit` sem erros
- [x] Modo mock ativo para Asaas/Evolution/Meta/Anthropic sem API key

---

## Estrutura Final

```
src/
├── app/
│   ├── (auth)/login/                   # Login
│   ├── (dashboard)/
│   │   ├── page.tsx                    # Dashboard admin/operador
│   │   ├── clients/[id]/               # Detalhes + 8 abas + reports + tasks + assets
│   │   ├── tasks/                      # Kanban geral
│   │   ├── contracts/                  # Listagem + new + [id] + catalog + packages
│   │   ├── proposals/                  # Pipeline + new + [id]
│   │   ├── billing/                    # Dashboard + forecast
│   │   ├── reports/                    # Listagem consolidada
│   │   ├── performance/                # SLA do time
│   │   └── settings/                   # billing, whatsapp, meta, ai
│   ├── portal/
│   │   ├── [token]/                    # Home, briefing, contract, billing, reports, assets, approvals
│   │   └── proposta/[token]/           # Proposta pública
│   └── api/
│       ├── webhooks/asaas/
│       └── cron/                       # weekly-tasks, monthly-tasks, overdue-tasks,
│                                       # billing-dunning, client-reminders,
│                                       # health-scores, team-metrics, meta-metrics
├── components/
│   ├── ui/                             # 25 componentes shadcn
│   ├── layout/                         # sidebar, header, mobile-nav, user-menu, notifications-bell
│   ├── auth/ clients/ tasks/ contracts/
│   ├── proposals/ billing/ reports/ assets/
│   ├── portal/                         # Componentes do portal público
│   ├── dashboard/ health/
├── lib/
│   ├── supabase/                       # client, server, admin, middleware
│   ├── asaas/                          # client, types, webhooks, mock
│   ├── evolution/                      # client, types
│   ├── meta/                           # client, types
│   ├── anthropic/                      # client com mock
│   ├── services/                       # task-generator, notifications, activity-log,
│   │                                   # whatsapp, billing-setup, health-score,
│   │                                   # team-metrics, ai-report-analysis, forecast,
│   │                                   # contract-builder, viacep, portal-auth, current-user
│   └── utils/                          # cn, format, validators, constants, contract-clauses
├── types/database.ts
└── styles/globals.css

supabase/migrations/
├── 001_initial_schema.sql              # Todas as tabelas do PRD
├── 002_rls_policies.sql                # RLS multi-tenant
├── 003_seed_data.sql                   # Adria + catálogo + pacotes + templates
└── 004_triggers.sql                    # updated_at + onboarding_progress + generate_contract_number
```
