# CLAUDE.md — AgencyOS by Adria

## Visão Geral

AgencyOS é um sistema operacional de agência para gestão de clientes de tráfego pago + IA. Ele automatiza onboarding, tarefas, contratos, relatórios e comunicação via WhatsApp.

**Dono:** Matheus — agência Adria (Campo Grande/MS)
**Modelo de negócio:** Pacotes de Geração de Demanda (Tráfego Pago + CRM + SDR de IA) a partir de R$ 1.500/mês
**Usuários:** 2 pessoas internas (admin + operador) + N clientes via portal público
**Idioma da interface:** 100% Português Brasileiro

---

## Stack Técnico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 14+ |
| Linguagem | TypeScript | 5+ |
| Estilo | Tailwind CSS | 3+ |
| Componentes | shadcn/ui | latest |
| Ícones | Lucide React | latest |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) | latest |
| Deploy | Vercel | — |
| WhatsApp (Fase 2) | Evolution API | v2 |
| Ads (Fase 3) | Meta Marketing API | v21.0 |
| IA (Fase 3) | Anthropic Claude API (Sonnet) | latest |

---

## Como Rodar

```bash
# Instalar dependências
npm install

# Variáveis de ambiente (.env.local)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Fase 2
EVOLUTION_API_URL=
EVOLUTION_API_KEY=

# Cobrança (Asaas)
ASAAS_API_KEY=
ASAAS_ENVIRONMENT=sandbox
ASAAS_WEBHOOK_SECRET=

# Fase 3
META_APP_ID=
META_APP_SECRET=
ANTHROPIC_API_KEY=

# Rodar dev
npm run dev
```

---

## Arquitetura e Padrões

### Estrutura de Pastas

```
src/
├── app/
│   ├── (auth)/                    # Rotas de autenticação (login)
│   │   ├── login/page.tsx
│   │   └── layout.tsx             # Layout sem sidebar
│   ├── (dashboard)/               # Rotas autenticadas (admin/operador)
│   │   ├── layout.tsx             # Layout com sidebar + header + notifications
│   │   ├── page.tsx               # Dashboard principal
│   │   ├── clients/               # CRUD de clientes
│   │   ├── tasks/                 # Kanban de tarefas
│   │   ├── contracts/             # Gestão de contratos e catálogo de serviços
│   │   ├── billing/               # Financeiro: cobranças, faturas, Asaas
│   │   ├── proposals/             # Propostas comerciais
│   │   ├── reports/               # Relatórios consolidados
│   │   ├── performance/           # SLA, métricas do time, forecast
│   │   └── settings/              # Configurações (org, Evolution API, etc.)
│   ├── portal/                    # Portal público do cliente (sem auth)
│   │   └── [token]/               # Rotas por token único do cliente
│   └── api/                       # API Routes
│       ├── clients/
│       ├── tasks/
│       ├── contracts/
│       ├── reports/
│       ├── webhooks/              # Webhooks externos (Evolution, Meta, Asaas)
│       └── cron/                  # Jobs agendados (tarefas recorrentes, régua cobrança)
├── components/
│   ├── ui/                        # shadcn/ui (não editar manualmente)
│   ├── layout/                    # Sidebar, Header, MobileNav
│   ├── dashboard/                 # Widgets do dashboard
│   ├── clients/                   # Componentes de clientes
│   ├── tasks/                     # Kanban, TaskCard, TaskFilters
│   ├── contracts/                 # ContractBuilder, ServiceSelector, SignaturePad
│   ├── proposals/                 # ProposalBuilder, ProposalPreview, ProposalPipeline
│   ├── billing/                   # InvoiceList, PaymentStatus, FinancialDashboard
│   ├── health/                    # HealthScoreBadge, HealthScoreBreakdown
│   ├── assets/                    # AssetGrid, AssetUploader, ApprovalQueue
│   ├── reports/                   # ReportCard, MetricsChart
│   └── portal/                    # Componentes do portal público
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # createBrowserClient (client components)
│   │   ├── server.ts              # createServerClient (server components/actions)
│   │   └── admin.ts               # createServiceRoleClient (API routes, cron)
│   ├── evolution/                 # Evolution API wrapper
│   ├── asaas/                     # Asaas payment API wrapper
│   │   ├── client.ts              # Asaas REST client (customers, subscriptions, payments)
│   │   ├── webhooks.ts            # Webhook payload validation & processing
│   │   └── types.ts               # Asaas API types
│   ├── meta/                      # Meta Marketing API wrapper
│   └── utils/
│       ├── format.ts              # Formatação BR (moeda, data, telefone)
│       ├── contracts.ts           # Geração de PDF, templates de cláusulas
│       └── constants.ts           # Enums, defaults, mensagens
├── hooks/
│   ├── use-clients.ts
│   ├── use-tasks.ts
│   ├── use-notifications.ts
│   └── use-realtime.ts            # Supabase Realtime subscriptions
├── types/
│   ├── database.ts                # Types gerados do Supabase (npx supabase gen types)
│   └── index.ts                   # Types customizados
└── styles/
    └── globals.css                # Tailwind + CSS variables do tema
```

### Convenções de Código

**Nomenclatura:**
- Arquivos: `kebab-case.ts` / `kebab-case.tsx`
- Componentes: `PascalCase` (export default)
- Funções/hooks: `camelCase`
- Types/Interfaces: `PascalCase` com prefixo descritivo (ex: `ClientWithTasks`, `TaskFormData`)
- Constantes: `UPPER_SNAKE_CASE`
- Tabelas SQL: `snake_case` (plural)
- Colunas SQL: `snake_case`

**Componentes:**
- Usar `"use client"` apenas quando necessário (interatividade, hooks de estado)
- Server Components por padrão — buscar dados no servidor sempre que possível
- Server Actions para mutations (criar/editar/deletar)
- Formulários com React Hook Form + Zod para validação
- Loading states com Skeleton components do shadcn

**Data Fetching:**
- Server Components: usar `createServerClient` diretamente
- Client Components: usar hooks customizados que encapsulam Supabase queries
- Mutations: Server Actions em `app/(dashboard)/[recurso]/actions.ts`
- Revalidação: `revalidatePath()` após mutations

**Estilo:**
- Tailwind utility classes (nunca CSS inline ou módulos CSS)
- shadcn/ui como base para todos os componentes de UI
- CSS variables para cores do tema (definidas em globals.css)
- Responsive: mobile-first (`sm:`, `md:`, `lg:`)
- Dark mode: usar classes `dark:` do Tailwind (dashboard = dark, portal = light)

### Padrões de Supabase

**Client-side (hooks):**
```typescript
import { createBrowserClient } from '@/lib/supabase/client'

const supabase = createBrowserClient()
const { data, error } = await supabase
  .from('clients')
  .select('*, tasks(*)')
  .eq('status', 'active')
```

**Server-side (Server Components / Server Actions):**
```typescript
import { createServerClient } from '@/lib/supabase/server'

const supabase = await createServerClient()
const { data } = await supabase.from('clients').select('*')
```

**Admin (API Routes / Cron — bypassa RLS):**
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient()
// Usado para cron jobs, webhooks, operações do sistema
```

**Realtime:**
```typescript
// Hook para escutar mudanças em tempo real
supabase
  .channel('tasks-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `assigned_to=eq.${userId}`
  }, (payload) => {
    // Atualizar estado local
  })
  .subscribe()
```

**RLS (Row Level Security):**
- TODAS as tabelas devem ter RLS ativado
- Políticas baseadas em `organization_id` (multi-tenant)
- Portal do cliente: acesso via `public_token` em API routes (sem auth do Supabase)
- Nunca expor `service_role_key` no client-side

### Padrões de API Routes

```typescript
// app/api/clients/route.ts
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()

  // Validar com Zod
  const parsed = clientSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  // Operação
  const { data, error } = await supabase
    .from('clients')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

### Formatação Brasil

Sempre usar formatação brasileira:
```typescript
// lib/utils/format.ts

// Moeda: R$ 1.500,00
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Data: 15/04/2026
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

// Telefone: (67) 99141-8064
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`
  }
  return phone
}
```

---

## Módulos do Sistema

### 1. Clientes
- CRUD completo com listagem, filtros e busca
- Página individual com abas (visão geral, tarefas, briefing, contrato, relatórios)
- Status lifecycle: `onboarding` → `active` → `paused` → `churned`
- Ao criar cliente: gera token público, dispara criação de tarefas de onboarding

### 2. Tarefas
- Kanban com drag-and-drop (colunas: Pendente, Em Andamento, Bloqueada, Concluída)
- Templates de tarefas (onboarding, semanal, mensal)
- Geração automática: onboarding ao criar cliente, recorrentes via cron
- Dependências entre tarefas (task B só libera quando task A estiver done)
- Prioridade automática: atrasada → urgente

### 3. Contratos
- Catálogo de serviços configurável (nome, descrição, preço base, tipo: mensal/único)
- Builder de contrato: admin seleciona serviços, ajusta preços, define prazo
- Cláusulas modulares: cada serviço tem suas cláusulas específicas
- Geração automática de PDF com dados do cliente + serviços selecionados
- Aceite digital no portal: cliente lê, preenche dados, aceita com registro de IP/timestamp
- Flag "tem implementação" adiciona serviço de implementação + cláusulas correspondentes

### 4. Cobrança Automática (Asaas)
- Integração via API REST com Asaas (plataforma brasileira de pagamentos)
- Ao assinar contrato: cria customer + subscription recorrente no Asaas automaticamente
- Suporta PIX (QR Code no portal), boleto e cartão de crédito
- Webhook `/api/webhooks/asaas` recebe eventos: PAYMENT_CONFIRMED, PAYMENT_OVERDUE, etc.
- Régua de cobrança: lembretes antes e depois do vencimento (email via Asaas + WhatsApp via Evolution API)
- Pausar serviço automaticamente após 15 dias de inadimplência
- Dashboard financeiro: MRR, inadimplência, cobranças do mês, status por cliente
- Portal do cliente: próxima fatura, QR Code PIX, histórico de pagamentos
- Cobranças avulsas para serviços adicionais ou implementação
- Split de pagamento (para quando o funcionário virar sócio)

### 5. Propostas Comerciais
- Gerador de propostas visuais com serviços do catálogo, cases e valores
- Link público para o prospect visualizar (portal/proposta/[token])
- Pipeline: rascunho → enviada → visualizada → aceita/recusada/expirada
- Ao aceitar: converte automaticamente em cliente + contrato (zero retrabalho)
- Notificação ao admin quando prospect abre a proposta

### 6. Health Score do Cliente
- Score composto 0-100 calculado semanalmente via cron job
- 5 dimensões: performance (30%), financeiro (25%), engajamento (20%), execução (15%), satisfação (10%)
- Classificação: saudável (≥70), atenção (40-69), crítico (<40)
- Alertas automáticos quando score cai de faixa
- Badge colorido no card de cada cliente, lista ordenada por piores

### 7. SLA e Performance do Time
- Métricas diárias por operador: tarefas completadas, taxa no prazo, tempo médio
- Consolidado mensal com SLA targets (≥90% no prazo, ≤60min resposta)
- Dashboard de evolução ao longo dos meses
- Detalhamento por cliente (quem está tomando mais tempo)
- Base objetiva para a futura sociedade

### 8. Biblioteca de Assets
- Repositório por cliente no Supabase Storage (assets/{client_id}/{category}/)
- Categorias: logo, brand_guide, photo, video, creative, copy, document
- Upload drag-and-drop, preview inline, tags para busca
- Versionamento de criativos (nova versão vincula à anterior)
- Fluxo de aprovação: operador sobe → cliente aprova/rejeita no portal
- Cliente pode enviar materiais pelo portal

### 9. Forecast de Receita
- MRR atual e projetado (3 meses)
- Contratos expirando (risco de não renovação)
- Churn risk baseado no health score
- Pipeline de propostas (valor potencial × taxa de conversão)
- Gráfico de receita: últimos 6 meses + 3 projetados

### 4. Relatórios
- Preenchimento manual de métricas (MVP) → automático via Meta API (Fase 3)
- Visualização com cards de métricas e gráficos
- Workflow: rascunho → publicado → enviado (WhatsApp)
- Visível no portal do cliente após publicação

### 5. Portal do Cliente
- Acesso via URL pública com token único (sem login)
- Mobile-first, tema light
- Briefing step-by-step, contrato digital, relatórios, progresso de onboarding
- Nenhum dado interno (tarefas, notas) é exposto ao cliente

### 6. Notificações
- In-app (badge no sino) com Supabase Realtime
- Tipos: tarefa atribuída, tarefa atrasada, briefing recebido, contrato assinado

---

## Regras Importantes

### Segurança
- NUNCA expor `SUPABASE_SERVICE_ROLE_KEY` no client-side
- Tokens de API (Meta, Evolution) armazenados no Supabase Vault ou em variáveis de ambiente
- Portal do cliente: validar `public_token` em cada request
- Sanitizar todo input do usuário (especialmente no portal público)

### Performance
- Server Components para tudo que não precisa de interatividade
- `revalidatePath` após mutations (não usar `router.refresh()`)
- Indexes no banco para queries frequentes (já definidos no schema)
- Imagens e logos no Supabase Storage com URL pública

### Multi-tenant
- `organization_id` presente em todas as tabelas relevantes
- RLS garante isolamento entre organizações
- Queries sempre filtram por org do usuário logado

---

## Comandos Úteis

```bash
# Gerar types do Supabase
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts

# Adicionar componente shadcn
npx shadcn-ui@latest add button card dialog input

# Build de produção
npm run build

# Lint
npm run lint
```

---

## PRD Completo

O PRD detalhado com schema SQL, fluxos de onboarding, templates de tarefas e plano de implementação está em `docs/PRD.md`. Consulte-o para decisões de produto e regras de negócio.

---

## Decisões de Arquitetura

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| App Router vs Pages | App Router | Server Components, Server Actions, layouts aninhados |
| ORM vs Query Builder | Supabase Client direto | Menos camada, tipagem gerada, RLS nativo |
| Drag-and-drop | @hello-pangea/dnd | Fork mantido do react-beautiful-dnd, leve |
| PDF de contrato | @react-pdf/renderer ou jsPDF | Gera PDF no server sem dependência externa |
| Validação | Zod | Integra com React Hook Form e Server Actions |
| Estado global | Nenhum (React Context se necessário) | Supabase Realtime + Server Components bastam |
| Tema dark/light | CSS variables + Tailwind `dark:` | Portal light, dashboard dark |
