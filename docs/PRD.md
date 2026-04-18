# PRD — AgencyOS by Adria

**Sistema Operacional de Agência para Gestão de Clientes de Tráfego Pago + IA**

**Versão:** 1.0
**Autor:** Matheus (Adria CRM)
**Data:** 15/04/2026
**Stack:** Next.js 14 (App Router) + Supabase + TypeScript + Tailwind CSS

---

## 1. Contexto e Problema

### 1.1 Sobre a Operação

A Adria é uma agência de geração de demanda que vende um pacote mensal de **R$ 1.500/mês** incluindo:

- **Tráfego Pago** — gestão de campanhas no Meta Ads (e eventualmente Google Ads)
- **CRM** — sistema proprietário AdriaCRM para gestão de leads do cliente
- **SDR de IA** — agente de IA via WhatsApp para qualificação e atendimento de leads

A operação hoje é composta por 2 pessoas:

- **Matheus** (fundador) — estratégia, vendas, configuração de IA, desenvolvimento
- **Funcionário** (a ser promovido a sócio) — atendimento ao cliente, gestão de tráfego, execução operacional

Clientes atuais incluem negócios locais como Café Beltrão (coffee break/eventos) e Oficina Renovação, adquiridos via indicação.

### 1.2 Problema Central

Não existe processo definido. Tudo depende de comunicação ad-hoc via WhatsApp entre Matheus e o funcionário. Isso causa:

- **Impossibilidade de delegar** — Matheus é gargalo em toda decisão
- **Onboarding lento** — cada cliente novo exige configuração manual de tudo
- **Falta de visibilidade** — ninguém sabe o status real de cada cliente
- **Retrabalho** — informações se perdem em conversas de WhatsApp
- **Escalabilidade zero** — não dá pra crescer de 2 para 6-7 clientes assim

### 1.3 Visão do Produto

Um sistema web interno (com portal público para o cliente) que:

1. Ao cadastrar um novo cliente, **dispara automaticamente todo o onboarding** (coleta de dados, contrato, briefing, criação de grupo no WhatsApp, checklist de tarefas)
2. Dá ao funcionário uma **visão clara de tudo que precisa ser feito** — quem responder, que tarefa executar, que prazo cumprir
3. Dá ao cliente uma **experiência profissional** — portal com andamento, relatórios, comunicação centralizada
4. Permite que Matheus **acompanhe tudo de longe** — dashboards, alertas, métricas

---

## 2. Personas

### 2.1 Matheus (Admin / Fundador)

- Cadastra novos clientes
- Define estratégias e briefings
- Monitora métricas de todos os clientes
- Configura automações e IA
- Acompanha performance do funcionário

### 2.2 Funcionário / Operador (Futuro Sócio)

- Executa tarefas de onboarding
- Gerencia campanhas no Meta Ads
- Responde clientes
- Atualiza status de tarefas
- Escala problemas para Matheus

### 2.3 Cliente (Portal Público)

- Preenche dados de briefing e contrato
- Acompanha andamento do trabalho
- Visualiza relatórios de performance
- Envia arquivos e informações solicitadas
- Aprova materiais (criativos, copies)

---

## 3. Arquitetura Técnica

### 3.1 Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend/API | Next.js API Routes + Supabase Edge Functions |
| Banco de Dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (admin/operador) + Magic Link (clientes) |
| Storage | Supabase Storage (arquivos, logos, criativos) |
| Realtime | Supabase Realtime (notificações, atualizações) |
| Deploy | Vercel |

### 3.2 Integrações (por fase)

| Integração | Fase | Finalidade |
|------------|------|------------|
| Supabase Auth/DB/Storage | MVP | Core do sistema |
| Asaas API | MVP | Cobrança automática: PIX, boleto, cartão, recorrência |
| Evolution API | Fase 2 | Criar grupos WhatsApp, enviar mensagens e relatórios |
| Meta Marketing API | Fase 3 | Puxar métricas de campanhas automaticamente |
| API Anthropic (Claude) | Fase 3 | Gerar insights de performance via IA |

### 3.3 Modelo de Dados (Supabase PostgreSQL)

```sql
-- ============================================
-- ORGANIZAÇÕES E USUÁRIOS
-- ============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "Adria"
  slug TEXT UNIQUE NOT NULL,             -- "adria"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENTES
-- ============================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- Dados básicos (preenchidos pelo admin no cadastro)
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,              -- WhatsApp principal
  contact_email TEXT,
  segment TEXT,                              -- "Cafeteria", "Oficina", "Clínica"
  
  -- Dados do pacote
  plan_name TEXT DEFAULT 'Geração de Demanda',
  monthly_fee NUMERIC(10,2) DEFAULT 1500.00,
  contract_start DATE,
  contract_months INTEGER DEFAULT 12,
  
  -- Status do ciclo de vida
  status TEXT NOT NULL DEFAULT 'onboarding' 
    CHECK (status IN ('onboarding', 'active', 'paused', 'churned')),
  onboarding_progress INTEGER DEFAULT 0,     -- 0-100%
  
  -- Portal público
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  portal_password_hash TEXT,                 -- senha simples pro portal
  
  -- Meta Ads (preenchido depois)
  meta_ad_account_id TEXT,
  meta_access_token TEXT,                    -- encrypted
  meta_pixel_id TEXT,
  
  -- WhatsApp
  whatsapp_group_id TEXT,                    -- ID do grupo na Evolution API
  whatsapp_group_created BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,                  -- quando saiu do onboarding
  
  -- Responsável
  assigned_to UUID REFERENCES profiles(id)
);

-- ============================================
-- BRIEFING (preenchido pelo cliente no portal)
-- ============================================

CREATE TABLE client_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Sobre o negócio
  business_description TEXT,                 -- "O que sua empresa faz?"
  target_audience TEXT,                      -- "Quem é seu cliente ideal?"
  main_products_services TEXT,               -- "Principais produtos/serviços"
  differentials TEXT,                        -- "O que te diferencia?"
  average_ticket NUMERIC(10,2),              -- Ticket médio
  monthly_revenue_range TEXT,                -- Faixa de faturamento
  
  -- Sobre o marketing
  has_website BOOLEAN DEFAULT FALSE,
  website_url TEXT,
  has_instagram BOOLEAN DEFAULT FALSE,
  instagram_handle TEXT,
  has_google_business BOOLEAN DEFAULT FALSE,
  current_ads_investment NUMERIC(10,2),      -- Quanto já investe em ads
  previous_agency_experience TEXT,           -- Experiência anterior com agência
  
  -- Objetivos
  main_goal TEXT,                            -- "Mais vendas", "Mais leads", etc.
  monthly_lead_goal INTEGER,
  monthly_revenue_goal NUMERIC(10,2),
  
  -- Materiais
  has_brand_guide BOOLEAN DEFAULT FALSE,
  brand_colors TEXT,                         -- Cores da marca (hex)
  brand_fonts TEXT,
  logo_url TEXT,                             -- Supabase Storage
  
  -- Acesso
  meta_business_manager_access TEXT,          -- "Já tem BM?", credenciais
  google_ads_access TEXT,
  
  -- Informações extras
  competitors TEXT,                          -- Concorrentes principais
  seasonal_periods TEXT,                     -- Datas sazonais importantes
  restrictions TEXT,                         -- "O que NÃO devemos comunicar?"
  additional_notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CATÁLOGO DE SERVIÇOS
-- ============================================

CREATE TABLE service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- Identificação
  name TEXT NOT NULL,                        -- "Gestão de Tráfego Pago"
  slug TEXT NOT NULL,                        -- "trafego-pago"
  description TEXT,                          -- Descrição para o cliente
  internal_notes TEXT,                       -- Notas internas (o que inclui de verdade)
  
  -- Categorização
  category TEXT NOT NULL
    CHECK (category IN (
      'recurring',                           -- Serviço mensal recorrente
      'one_time',                            -- Serviço único (implementação, setup)
      'add_on'                               -- Adicional opcional
    )),
  
  -- Preço
  base_price NUMERIC(10,2) NOT NULL,         -- Preço base (pode ser customizado por contrato)
  price_type TEXT NOT NULL DEFAULT 'monthly'
    CHECK (price_type IN ('monthly', 'one_time', 'per_unit')),
  
  -- Cláusulas contratuais vinculadas
  contract_clauses JSONB DEFAULT '[]',       -- Array de cláusulas que este serviço adiciona ao contrato
  -- Formato: [{ "title": "...", "body": "...", "order": 1 }]
  
  -- Tarefas de onboarding vinculadas
  onboarding_task_templates UUID[],          -- IDs dos task_templates que este serviço dispara
  
  -- Controle
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PACOTES PRÉ-DEFINIDOS (atalho para combos comuns)
-- ============================================

CREATE TABLE service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  name TEXT NOT NULL,                        -- "Geração de Demanda"
  description TEXT,                          -- "Tráfego + CRM + SDR de IA"
  
  -- Preço do pacote (pode ter desconto vs. soma dos serviços)
  package_price NUMERIC(10,2) NOT NULL,      -- R$ 1.500,00
  
  -- Serviços incluídos
  included_services JSONB NOT NULL,          -- [{ "service_id": "uuid", "custom_price": null }]
  
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONTRATOS
-- ============================================

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  
  -- Número do contrato (auto-gerado)
  contract_number TEXT UNIQUE NOT NULL,      -- "ADRIA-2026-001"
  
  -- Dados do contratante (preenchidos pelo cliente no portal)
  legal_name TEXT,                           -- Razão social ou nome completo
  document_type TEXT CHECK (document_type IN ('cpf', 'cnpj')),
  document_number TEXT,                      -- CPF ou CNPJ
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  
  -- Dados do contratado (pré-preenchidos pelo sistema)
  contractor_legal_name TEXT DEFAULT 'Adria Tecnologia e Marketing Digital',
  contractor_document TEXT,                  -- CNPJ da Adria
  contractor_address TEXT,
  
  -- Termos financeiros
  total_monthly_value NUMERIC(10,2),         -- Soma dos serviços recorrentes
  total_one_time_value NUMERIC(10,2),        -- Soma dos serviços únicos (implementação etc.)
  payment_method TEXT,                       -- "PIX", "Boleto", "Cartão"
  payment_due_day INTEGER DEFAULT 10,        -- Dia do vencimento
  
  -- Duração
  contract_months INTEGER DEFAULT 12,
  start_date DATE,
  end_date DATE,                             -- Calculado: start_date + contract_months
  auto_renew BOOLEAN DEFAULT TRUE,
  
  -- Flags de serviço
  has_implementation BOOLEAN DEFAULT FALSE,  -- Se inclui setup/implementação
  implementation_fee NUMERIC(10,2),          -- Valor da implementação
  implementation_description TEXT,           -- O que a implementação inclui
  
  -- Multas e penalidades (cláusulas padrão)
  late_fee_percentage NUMERIC(4,2) DEFAULT 2.00,    -- Multa por atraso (%)
  late_interest_monthly NUMERIC(4,2) DEFAULT 1.00,  -- Juros mensal (%)
  cancellation_fee_percentage NUMERIC(4,2) DEFAULT 20.00, -- Multa rescisória (%)
  cancellation_notice_days INTEGER DEFAULT 30,       -- Aviso prévio (dias)
  
  -- Cláusulas customizadas (adicionadas manualmente pelo admin)
  custom_clauses JSONB DEFAULT '[]',         -- [{ "title": "...", "body": "...", "order": 99 }]
  
  -- Notas internas (não aparecem no contrato)
  internal_notes TEXT,
  
  -- PDF gerado
  pdf_url TEXT,                              -- URL no Supabase Storage
  pdf_generated_at TIMESTAMPTZ,
  
  -- Assinatura digital
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',                               -- Admin montando o contrato
      'pending_review',                      -- Aguardando revisão do admin
      'sent',                                -- Enviado ao cliente (link do portal)
      'viewed',                              -- Cliente abriu o contrato
      'signed',                              -- Cliente aceitou
      'expired',                             -- Prazo de aceite expirou
      'cancelled'                            -- Cancelado
    )),
  
  sent_at TIMESTAMPTZ,                       -- Quando foi enviado ao cliente
  viewed_at TIMESTAMPTZ,                     -- Quando o cliente abriu
  signed_at TIMESTAMPTZ,                     -- Quando o cliente aceitou
  
  -- Dados da assinatura (prova jurídica)
  signature_ip TEXT,                         -- IP do cliente no aceite
  signature_user_agent TEXT,                 -- Browser do cliente no aceite
  signature_full_name TEXT,                  -- Nome digitado pelo cliente no aceite
  signature_document_typed TEXT,             -- CPF/CNPJ digitado para conferência
  signature_consent_text TEXT,               -- Texto exato que o cliente concordou
  
  -- Quem criou/enviou
  created_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVIÇOS DO CONTRATO (junction table)
-- ============================================

CREATE TABLE contract_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  service_id UUID REFERENCES service_catalog(id),
  
  -- Dados do serviço no momento da contratação (snapshot)
  service_name TEXT NOT NULL,                -- Nome do serviço (copiado do catálogo)
  service_description TEXT,
  service_category TEXT NOT NULL,
  
  -- Preço negociado (pode diferir do catálogo)
  price NUMERIC(10,2) NOT NULL,
  price_type TEXT NOT NULL,
  
  -- Quantidade (para serviços per_unit)
  quantity INTEGER DEFAULT 1,
  
  -- Cláusulas específicas deste serviço
  clauses JSONB DEFAULT '[]',               -- Copiadas do catálogo + customizações
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LOG DE EVENTOS DO CONTRATO (auditoria)
-- ============================================

CREATE TABLE contract_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'created', 'edited', 'pdf_generated',
      'sent', 'viewed', 'signed',
      'expired', 'cancelled', 'renewed'
    )),
  
  -- Quem causou o evento
  actor_type TEXT DEFAULT 'team'
    CHECK (actor_type IN ('team', 'client', 'system')),
  actor_id UUID REFERENCES profiles(id),    -- NULL se for cliente ou sistema
  
  -- Detalhes
  description TEXT,
  metadata JSONB,                            -- Dados extras (IP, user agent, etc.)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para contratos
CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_number ON contracts(contract_number);
CREATE INDEX idx_contract_services_contract ON contract_services(contract_id);
CREATE INDEX idx_contract_events_contract ON contract_events(contract_id);
CREATE INDEX idx_service_catalog_org ON service_catalog(organization_id);

-- RLS para contratos
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_contracts" ON contracts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_members_contract_services" ON contract_services
  FOR ALL USING (
    contract_id IN (
      SELECT id FROM contracts WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "org_members_service_catalog" ON service_catalog
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- COBRANÇA E FATURAMENTO (Asaas)
-- ============================================

CREATE TABLE billing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- Credenciais Asaas
  asaas_api_key TEXT NOT NULL,               -- API Key (encrypted via Supabase Vault)
  asaas_environment TEXT DEFAULT 'sandbox'
    CHECK (asaas_environment IN ('sandbox', 'production')),
  asaas_wallet_id TEXT,                      -- ID da conta Asaas
  
  -- Dados da empresa (usados nas cobranças)
  company_legal_name TEXT,
  company_document TEXT,                     -- CNPJ
  
  -- Configurações padrão
  default_payment_method TEXT DEFAULT 'PIX'
    CHECK (default_payment_method IN ('PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED')),
  default_due_day INTEGER DEFAULT 10,
  default_fine_percentage NUMERIC(4,2) DEFAULT 2.00,   -- Multa por atraso
  default_interest_monthly NUMERIC(4,2) DEFAULT 1.00,  -- Juros mensal
  default_discount_days INTEGER DEFAULT 0,              -- Dias de desconto antecipado
  default_discount_value NUMERIC(10,2) DEFAULT 0,
  
  -- Régua de cobrança (notificações automáticas)
  notify_before_due_days INTEGER[] DEFAULT '{3,1}',     -- Avisar X dias antes
  notify_after_due_days INTEGER[] DEFAULT '{1,3,7,15}', -- Cobrar X dias após vencimento
  notify_channels TEXT[] DEFAULT '{email,whatsapp}',
  
  -- Ações automáticas por inadimplência
  pause_service_after_days INTEGER DEFAULT 15,           -- Pausar serviço após X dias de atraso
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE client_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Dados do cliente no Asaas
  asaas_customer_id TEXT,                    -- ID do customer no Asaas
  
  -- Assinatura recorrente
  asaas_subscription_id TEXT,                -- ID da subscription no Asaas
  subscription_status TEXT DEFAULT 'pending'
    CHECK (subscription_status IN (
      'pending',                              -- Ainda não criou no Asaas
      'active',                               -- Cobrança recorrente ativa
      'paused',                               -- Pausada (inadimplência ou pedido)
      'cancelled'                             -- Cancelada
    )),
  
  -- Valores
  monthly_value NUMERIC(10,2) NOT NULL,      -- Valor mensal cobrado
  implementation_value NUMERIC(10,2),        -- Valor de implementação (cobrança única)
  implementation_paid BOOLEAN DEFAULT FALSE,
  
  -- Forma de pagamento preferida
  payment_method TEXT DEFAULT 'PIX'
    CHECK (payment_method IN ('PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED')),
  
  -- Dia do vencimento
  due_day INTEGER DEFAULT 10,
  
  -- Desconto (ex: 5% pra pagamento até dia 5)
  discount_value NUMERIC(10,2) DEFAULT 0,
  discount_due_date_limit INTEGER DEFAULT 0,  -- Até X dias antes do vencimento
  
  -- Multa e juros customizados (sobrescreve o padrão)
  custom_fine_percentage NUMERIC(4,2),
  custom_interest_monthly NUMERIC(4,2),
  
  -- Split (se tiver sócio recebendo parte)
  split_enabled BOOLEAN DEFAULT FALSE,
  split_wallets JSONB,                       -- [{ "wallet_id": "...", "percentage": 50 }]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_billing_id UUID REFERENCES client_billing(id),
  
  -- Dados da cobrança no Asaas
  asaas_payment_id TEXT UNIQUE,              -- ID do payment no Asaas
  
  -- Tipo
  invoice_type TEXT NOT NULL
    CHECK (invoice_type IN (
      'recurring',                            -- Mensal recorrente
      'implementation',                       -- Cobrança de implementação
      'additional',                           -- Serviço adicional avulso
      'adjustment'                            -- Ajuste (desconto, crédito)
    )),
  
  -- Valores
  gross_value NUMERIC(10,2) NOT NULL,        -- Valor bruto
  discount_value NUMERIC(10,2) DEFAULT 0,
  fine_value NUMERIC(10,2) DEFAULT 0,        -- Multa aplicada
  interest_value NUMERIC(10,2) DEFAULT 0,    -- Juros aplicados
  net_value NUMERIC(10,2) NOT NULL,          -- Valor líquido (pago)
  
  -- Datas
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',                              -- Aguardando pagamento
      'confirmed',                            -- Pagamento confirmado
      'received',                             -- Recebido (compensado)
      'overdue',                              -- Vencido
      'refunded',                             -- Estornado
      'cancelled'                             -- Cancelado
    )),
  
  -- Método de pagamento usado
  payment_method TEXT,
  
  -- Link de pagamento (enviado ao cliente)
  payment_url TEXT,                          -- URL do Asaas para pagamento
  pix_qr_code TEXT,                          -- QR Code PIX (base64)
  pix_copy_paste TEXT,                       -- Código PIX copia e cola
  boleto_url TEXT,                           -- URL do boleto
  
  -- Referência (mês/ano da competência)
  reference_month INTEGER,                   -- 1-12
  reference_year INTEGER,
  
  -- Notas
  description TEXT,                          -- "Geração de Demanda — Abril/2026"
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  invoice_id UUID REFERENCES billing_invoices(id),
  
  -- Tipo de evento
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'invoice_created',                     -- Cobrança criada
      'invoice_sent',                        -- Enviada ao cliente
      'payment_received',                    -- Pagamento confirmado
      'payment_overdue',                     -- Venceu sem pagar
      'reminder_sent',                       -- Lembrete enviado (email/whatsapp)
      'service_paused',                      -- Serviço pausado por inadimplência
      'service_resumed',                     -- Serviço retomado após pagamento
      'subscription_created',                -- Assinatura recorrente criada
      'subscription_paused',                 -- Assinatura pausada
      'subscription_cancelled',              -- Assinatura cancelada
      'refund_issued',                       -- Estorno emitido
      'dunning_escalated'                    -- Escalou nível de cobrança
    )),
  
  description TEXT,
  metadata JSONB,                            -- Payload do webhook do Asaas
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para billing
CREATE INDEX idx_client_billing_client ON client_billing(client_id);
CREATE INDEX idx_billing_invoices_client ON billing_invoices(client_id);
CREATE INDEX idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX idx_billing_invoices_due ON billing_invoices(due_date);
CREATE INDEX idx_billing_invoices_asaas ON billing_invoices(asaas_payment_id);
CREATE INDEX idx_billing_events_client ON billing_events(client_id);
CREATE INDEX idx_billing_events_invoice ON billing_events(invoice_id);

-- RLS
ALTER TABLE client_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_billing" ON client_billing
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "org_members_invoices" ON billing_invoices
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================
-- TAREFAS (motor de execução)
-- ============================================

CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- Definição
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL 
    CHECK (category IN (
      'onboarding',          -- Tarefas de setup inicial
      'recurring_weekly',    -- Tarefas que se repetem toda semana
      'recurring_monthly',   -- Tarefas que se repetem todo mês
      'one_time'             -- Tarefas avulsas
    )),
  
  -- Ordenação e dependências
  sort_order INTEGER DEFAULT 0,
  depends_on UUID REFERENCES task_templates(id),  -- Só libera quando a anterior terminar
  
  -- Auto-assign
  default_assignee TEXT CHECK (default_assignee IN ('admin', 'operator')),
  
  -- Prazo padrão
  default_due_days INTEGER,                  -- Dias após criação da tarefa
  
  -- Automação
  auto_trigger TEXT,                          -- Evento que cria esta tarefa automaticamente
                                              -- Ex: 'client_created', 'briefing_completed', 
                                              -- 'month_start', 'week_start'
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES task_templates(id),
  
  -- Detalhes
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  
  -- Responsável
  assigned_to UUID REFERENCES profiles(id),
  
  -- Prazo e status
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'in_progress', 'blocked', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  
  -- Notas
  notes TEXT,
  
  -- Ordenação
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RELATÓRIOS DE PERFORMANCE
-- ============================================

CREATE TABLE performance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Período
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_type TEXT DEFAULT 'monthly' 
    CHECK (report_type IN ('weekly', 'monthly')),
  
  -- Métricas do Meta Ads
  ad_spend NUMERIC(10,2),
  impressions INTEGER,
  clicks INTEGER,
  ctr NUMERIC(5,4),                          -- Click-through rate
  cpc NUMERIC(10,2),                         -- Custo por clique
  leads INTEGER,
  cpl NUMERIC(10,2),                         -- Custo por lead
  conversions INTEGER,
  cost_per_conversion NUMERIC(10,2),
  
  -- Métricas do CRM/SDR
  leads_contacted INTEGER,
  leads_qualified INTEGER,
  appointments_booked INTEGER,
  
  -- Análise
  highlights TEXT,                           -- Destaques do período
  improvements TEXT,                         -- O que melhorar
  next_actions TEXT,                         -- Próximas ações
  ai_analysis TEXT,                          -- Análise gerada por IA (Fase 3)
  
  -- Status
  status TEXT DEFAULT 'draft' 
    CHECK (status IN ('draft', 'published', 'sent')),
  published_at TIMESTAMPTZ,
  sent_via_whatsapp BOOLEAN DEFAULT FALSE,
  
  -- Visível no portal do cliente
  visible_to_client BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ATIVIDADES / LOG DE COMUNICAÇÃO
-- ============================================

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Quem fez
  actor_id UUID REFERENCES profiles(id),     -- NULL se for o cliente ou sistema
  actor_type TEXT DEFAULT 'team' 
    CHECK (actor_type IN ('team', 'client', 'system', 'ai')),
  
  -- O que aconteceu
  action TEXT NOT NULL,                       -- 'task_completed', 'briefing_submitted',
                                              -- 'report_published', 'message_sent', etc.
  description TEXT NOT NULL,                  -- Descrição legível
  metadata JSONB,                             -- Dados extras estruturados
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICAÇÕES
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,                                  -- URL para onde levar o usuário
  read BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CONFIGURAÇÕES DA EVOLUTION API (Fase 2)
-- ============================================

CREATE TABLE evolution_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  instance_name TEXT NOT NULL,
  api_url TEXT NOT NULL,                      -- URL da instância Evolution
  api_key TEXT NOT NULL,                      -- API Key (encrypted)
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROPOSTAS COMERCIAIS
-- ============================================

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Identificação
  proposal_number TEXT UNIQUE NOT NULL,       -- "ADRIA-PROP-2026-001"
  title TEXT NOT NULL,                        -- "Proposta de Geração de Demanda"
  
  -- Dados do prospect (pode ser criado antes de virar cliente)
  prospect_name TEXT NOT NULL,
  prospect_company TEXT,
  prospect_email TEXT,
  prospect_phone TEXT,
  
  -- Conteúdo da proposta
  introduction TEXT,                          -- Texto de abertura personalizado
  problem_statement TEXT,                     -- "Diagnóstico" do problema do cliente
  solution_description TEXT,                  -- Como a Adria vai resolver
  
  -- Serviços propostos (mesma estrutura do contrato)
  proposed_services JSONB NOT NULL,           -- [{ service_id, name, description, price, price_type }]
  
  -- Cases / Portfólio (opcional)
  case_studies JSONB DEFAULT '[]',            -- [{ client_name, result, testimonial }]
  
  -- Valores
  total_monthly NUMERIC(10,2),
  total_one_time NUMERIC(10,2),
  has_implementation BOOLEAN DEFAULT FALSE,
  implementation_fee NUMERIC(10,2),
  
  -- Validade
  valid_until DATE,                           -- Data limite para aceite
  
  -- Condições especiais
  special_conditions TEXT,                    -- Desconto, bônus, condições especiais
  
  -- Portal público
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',                                -- Rascunho
      'sent',                                 -- Enviada ao prospect
      'viewed',                               -- Prospect abriu
      'accepted',                             -- Prospect aceitou
      'rejected',                             -- Prospect recusou
      'expired',                              -- Expirou sem resposta
      'converted'                             -- Convertida em contrato
    )),
  
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  rejection_reason TEXT,                      -- Se recusou, por quê?
  
  -- Conversão
  converted_contract_id UUID REFERENCES contracts(id),
  converted_client_id UUID REFERENCES clients(id),
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HEALTH SCORE DO CLIENTE
-- ============================================

CREATE TABLE client_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Score composto (0-100)
  overall_score INTEGER NOT NULL,
  
  -- Dimensões individuais (0-100 cada)
  financial_score INTEGER NOT NULL,           -- Pagamentos em dia, inadimplência
  performance_score INTEGER NOT NULL,         -- CPL, CTR, tendência de ads
  engagement_score INTEGER NOT NULL,          -- Comunicação, portal visits, aprovações
  task_score INTEGER NOT NULL,                -- Tarefas no prazo, onboarding speed
  satisfaction_score INTEGER,                 -- NPS, feedback (quando disponível)
  
  -- Dados que alimentaram o score
  score_breakdown JSONB NOT NULL,             -- Detalhamento de cada métrica
  /*
    Exemplo:
    {
      "financial": {
        "invoices_on_time": 5,
        "invoices_total": 6,
        "days_overdue_avg": 0,
        "current_overdue": false
      },
      "performance": {
        "cpl_trend": "improving",
        "cpl_current": 12.50,
        "cpl_previous": 15.00,
        "budget_utilization": 0.92
      },
      "engagement": {
        "portal_visits_30d": 4,
        "avg_approval_time_hours": 18,
        "messages_responded": true,
        "last_interaction_days": 3
      },
      "task": {
        "onboarding_days": 11,
        "tasks_on_time_ratio": 0.88,
        "blocked_tasks": 1
      }
    }
  */
  
  -- Classificação
  health_status TEXT NOT NULL
    CHECK (health_status IN (
      'healthy',                              -- Score >= 70: tudo bem
      'attention',                            -- Score 40-69: precisa de atenção
      'critical'                              -- Score < 40: risco de churn
    )),
  
  -- Alertas gerados
  alerts JSONB DEFAULT '[]',                  -- [{ type, message, severity }]
  
  -- Período do cálculo
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  period_start DATE,
  period_end DATE
);

-- ============================================
-- MÉTRICAS DE SLA E PERFORMANCE DO TIME
-- ============================================

CREATE TABLE team_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  profile_id UUID REFERENCES profiles(id),   -- De quem é a métrica
  metric_date DATE NOT NULL,
  
  -- Tarefas
  tasks_completed INTEGER DEFAULT 0,
  tasks_on_time INTEGER DEFAULT 0,            -- Completadas dentro do prazo
  tasks_overdue INTEGER DEFAULT 0,            -- Completadas após o prazo
  tasks_pending INTEGER DEFAULT 0,            -- Em aberto no final do dia
  avg_completion_hours NUMERIC(8,2),          -- Tempo médio de conclusão (horas)
  
  -- Clientes
  clients_active INTEGER DEFAULT 0,           -- Clientes sob responsabilidade
  clients_contacted INTEGER DEFAULT 0,        -- Clientes com interação no dia
  
  -- Comunicação
  messages_sent INTEGER DEFAULT 0,
  avg_response_time_minutes NUMERIC(8,2),     -- Tempo médio de resposta
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profile_id, metric_date)
);

CREATE TABLE team_metrics_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  profile_id UUID REFERENCES profiles(id),
  metric_month INTEGER NOT NULL,              -- 1-12
  metric_year INTEGER NOT NULL,
  
  -- Consolidado do mês
  total_tasks_completed INTEGER DEFAULT 0,
  on_time_rate NUMERIC(5,4),                  -- % de tarefas no prazo (0.0000-1.0000)
  avg_completion_hours NUMERIC(8,2),
  total_clients_managed INTEGER DEFAULT 0,
  
  -- SLA
  sla_met BOOLEAN,                            -- Atingiu SLA do mês?
  sla_details JSONB,                          -- Detalhamento de cada SLA
  /*
    {
      "task_completion_target": 0.90,
      "task_completion_actual": 0.92,
      "response_time_target_min": 60,
      "response_time_actual_min": 45,
      "reports_delivered_on_time": true
    }
  */
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(profile_id, metric_month, metric_year)
);

-- ============================================
-- BIBLIOTECA DE ASSETS
-- ============================================

CREATE TABLE client_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Arquivo
  file_name TEXT NOT NULL,                    -- Nome original do arquivo
  file_url TEXT NOT NULL,                     -- URL no Supabase Storage
  file_size INTEGER,                          -- Bytes
  file_type TEXT,                             -- MIME type
  thumbnail_url TEXT,                         -- Preview (gerado automaticamente)
  
  -- Categorização
  category TEXT NOT NULL
    CHECK (category IN (
      'logo',                                 -- Logos da marca
      'brand_guide',                          -- Manual de marca, paleta, fontes
      'photo',                                -- Fotos do negócio, produtos, equipe
      'video',                                -- Vídeos do negócio
      'creative',                             -- Criativos de ads (imagens, carrosséis)
      'copy',                                 -- Textos de ads, scripts
      'document',                             -- Contratos, briefings, relatórios
      'other'
    )),
  
  -- Metadados
  tags TEXT[],                                -- Tags livres: ["campanha-junho", "stories"]
  description TEXT,
  
  -- Versionamento (para criativos)
  version INTEGER DEFAULT 1,
  parent_asset_id UUID REFERENCES client_assets(id),  -- Asset anterior (se for nova versão)
  
  -- Aprovação (para criativos que precisam de OK do cliente)
  approval_status TEXT DEFAULT 'not_required'
    CHECK (approval_status IN (
      'not_required',                         -- Não precisa de aprovação
      'pending',                              -- Aguardando aprovação do cliente
      'approved',                             -- Cliente aprovou
      'rejected'                              -- Cliente rejeitou
    )),
  approved_at TIMESTAMPTZ,
  rejection_note TEXT,
  
  -- Quem enviou
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_by_client BOOLEAN DEFAULT FALSE,   -- Se o cliente enviou pelo portal
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para novos módulos
CREATE INDEX idx_proposals_org ON proposals(organization_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_client ON proposals(client_id);
CREATE INDEX idx_health_scores_client ON client_health_scores(client_id);
CREATE INDEX idx_health_scores_date ON client_health_scores(calculated_at);
CREATE INDEX idx_team_metrics_daily ON team_metrics_daily(profile_id, metric_date);
CREATE INDEX idx_team_metrics_monthly ON team_metrics_monthly(profile_id, metric_year, metric_month);
CREATE INDEX idx_assets_client ON client_assets(client_id);
CREATE INDEX idx_assets_category ON client_assets(client_id, category);
CREATE INDEX idx_assets_approval ON client_assets(approval_status);

-- RLS para novos módulos
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_proposals" ON proposals
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_members_health" ON client_health_scores
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "org_members_team_metrics" ON team_metrics_daily
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_members_assets" ON client_assets
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_clients_org ON clients(organization_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_assigned ON clients(assigned_to);
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_reports_client ON performance_reports(client_id);
CREATE INDEX idx_activity_client ON activity_log(client_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas: membros da mesma organization veem tudo da org
CREATE POLICY "org_members_clients" ON clients
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_members_tasks" ON tasks
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Notificações: cada user só vê as suas
CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());
```

### 3.4 Estrutura de Pastas (Next.js App Router)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                    -- Sidebar + header
│   │   ├── page.tsx                      -- Dashboard principal
│   │   ├── clients/
│   │   │   ├── page.tsx                  -- Lista de clientes
│   │   │   ├── new/page.tsx              -- Cadastro de cliente
│   │   │   └── [id]/
│   │   │       ├── page.tsx              -- Detalhes do cliente
│   │   │       ├── tasks/page.tsx        -- Tarefas do cliente
│   │   │       ├── reports/page.tsx      -- Relatórios do cliente
│   │   │       └── briefing/page.tsx     -- Briefing do cliente
│   │   ├── tasks/
│   │   │   ├── page.tsx                  -- Kanban geral (todas as tarefas)
│   │   │   └── templates/page.tsx        -- Templates de tarefas
│   │   ├── reports/
│   │   │   └── page.tsx                  -- Relatórios consolidados
│   │   └── settings/
│   │       └── page.tsx                  -- Configurações
│   ├── portal/
│   │   └── [token]/
│   │       ├── page.tsx                  -- Portal do cliente (público)
│   │       ├── briefing/page.tsx         -- Formulário de briefing
│   │       ├── contract/page.tsx         -- Aceite de contrato
│   │       └── reports/page.tsx          -- Relatórios publicados
│   └── api/
│       ├── clients/route.ts
│       ├── tasks/route.ts
│       ├── reports/route.ts
│       ├── webhooks/
│       │   └── evolution/route.ts        -- Webhooks da Evolution API
│       └── cron/
│           ├── weekly-tasks/route.ts     -- Gera tarefas semanais
│           └── monthly-tasks/route.ts    -- Gera tarefas mensais
├── components/
│   ├── ui/                               -- shadcn/ui components
│   ├── dashboard/
│   ├── clients/
│   ├── tasks/
│   └── portal/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   ├── evolution/                        -- Evolution API client
│   │   ├── client.ts
│   │   ├── groups.ts
│   │   └── messages.ts
│   ├── meta/                             -- Meta Marketing API client
│   │   ├── client.ts
│   │   └── reports.ts
│   └── utils/
├── hooks/
└── types/
```

---

## 4. Funcionalidades — MVP (Fase 1)

### 4.1 Dashboard Principal

**Visão do Administrador (Matheus):**

- **Cartões de resumo no topo:**
  - Total de clientes ativos
  - Receita recorrente mensal (MRR)
  - Tarefas pendentes (total e urgentes)
  - Clientes em onboarding

- **Seção "Atenção Necessária"** (lista priorizada):
  - Clientes com tarefas atrasadas
  - Briefings não preenchidos há mais de 3 dias
  - Contratos pendentes de assinatura
  - Clientes sem relatório do mês

- **Timeline de atividades recentes** (últimas 20):
  - "[Operador] completou tarefa X para [Cliente]"
  - "[Cliente] preencheu o briefing"
  - "Sistema gerou tarefas semanais para 3 clientes"

**Visão do Operador (Funcionário):**

- **"Meu dia"** — tarefas atribuídas a ele para hoje e atrasadas
- **"Minha semana"** — visão semanal das tarefas
- **Lista de clientes sob sua responsabilidade** com status rápido (semáforo)

### 4.2 Cadastro de Novo Cliente

**Formulário admin (campos mínimos para começar):**

```
- Nome da empresa *
- Nome do contato *
- WhatsApp *
- E-mail
- Segmento
- Valor mensal (default: R$ 1.500)
- Duração do contrato (default: 12 meses)
- Data de início
- Responsável (admin ou operador)
```

**Ao salvar, o sistema automaticamente:**

1. Cria o registro do cliente com status `onboarding`
2. Gera o `public_token` (link do portal)
3. Cria todas as tarefas de onboarding a partir dos templates
4. Registra no activity_log: "Cliente [nome] cadastrado"
5. Exibe o link do portal para compartilhar com o cliente

### 4.3 Fluxo de Onboarding (Checklist Automático)

Ao cadastrar um cliente, o sistema cria automaticamente as seguintes tarefas (baseado em `task_templates`):

```
ONBOARDING — GERAÇÃO DE DEMANDA (Tráfego + CRM + SDR IA)
═══════════════════════════════════════════════════════════

ETAPA 1: COLETA DE DADOS (Dias 1-3)
────────────────────────────────────
□ Enviar link do portal para o cliente                  → Operador  | Dia 0
□ Cliente preencher briefing no portal                  → Cliente   | Dia 3
□ Cliente assinar contrato no portal                    → Cliente   | Dia 3
□ Revisar briefing preenchido                           → Admin     | Dia 4
□ Coletar acesso ao Business Manager do Meta            → Operador  | Dia 3
□ Coletar acesso ao Instagram / Facebook Page           → Operador  | Dia 3
□ Coletar logo e materiais da marca                     → Operador  | Dia 3

ETAPA 2: CONFIGURAÇÃO TÉCNICA (Dias 3-7)
─────────────────────────────────────────
□ Criar conta de anúncios no Meta (se não existir)      → Operador  | Dia 5
□ Instalar Pixel do Meta no site (se tiver site)        → Operador  | Dia 5
□ Configurar domínio de verificação                     → Operador  | Dia 5
□ Configurar eventos de conversão                       → Operador  | Dia 7
□ Cadastrar cliente no AdriaCRM                         → Operador  | Dia 5
□ Configurar SDR de IA no AdriaCRM                      → Admin     | Dia 7
□ Criar grupo WhatsApp com cliente (manual ou API)      → Operador  | Dia 3

ETAPA 3: ESTRATÉGIA E CRIATIVOS (Dias 5-10)
────────────────────────────────────────────
□ Definir público-alvo e segmentação                    → Admin     | Dia 7
□ Definir orçamento diário de ads                       → Admin     | Dia 7
□ Criar 3 variações de copy                             → Operador  | Dia 8
□ Criar 3 variações de criativo (imagem/vídeo)          → Operador  | Dia 8
□ Aprovar copies e criativos com cliente                → Admin     | Dia 10

ETAPA 4: LANÇAMENTO (Dias 10-14)
────────────────────────────────
□ Subir campanhas no Meta Ads                           → Operador  | Dia 12
□ Configurar regras automáticas (orçamento, pausa)      → Operador  | Dia 12
□ Validar tracking e pixel                              → Operador  | Dia 12
□ Enviar mensagem de boas-vindas ao grupo WhatsApp      → Operador  | Dia 12
□ Primeira revisão 24h após lançamento                  → Operador  | Dia 13
□ Enviar primeiro mini-relatório ao cliente              → Operador  | Dia 14

→ Ao completar todas: status muda para 'active' automaticamente
→ Tarefas recorrentes (semanais/mensais) são ativadas
```

### 4.4 Tarefas Recorrentes (Automáticas)

O sistema gera automaticamente para cada cliente ativo:

**Semanais (toda segunda-feira):**
```
□ Revisar performance das campanhas         → Operador
□ Otimizar anúncios (pausar ruins, escalar bons) → Operador
□ Checar leads no CRM e qualidade do SDR    → Operador
□ Atualizar cliente no grupo WhatsApp       → Operador
```

**Mensais (todo dia 1):**
```
□ Gerar relatório mensal de performance     → Operador
□ Revisar e aprovar relatório               → Admin
□ Publicar relatório no portal do cliente   → Admin
□ Enviar relatório via WhatsApp             → Operador
□ Reunião de alinhamento com cliente        → Admin
□ Renovar criativos (novos copies/visuais)  → Operador
□ Revisar e ajustar estratégia de público   → Admin
```

### 4.5 Kanban de Tarefas

**Visão principal do operador** — onde ele vive no dia a dia.

**Colunas:**
- **Pendente** — tarefas criadas mas não iniciadas
- **Em andamento** — tarefas que alguém está executando
- **Bloqueada** — dependendo do cliente ou de outra tarefa
- **Concluída** — feita

**Filtros:**
- Por cliente
- Por responsável (minha / todas)
- Por categoria (onboarding / semanal / mensal / avulsa)
- Por prioridade
- Por prazo (atrasadas / hoje / esta semana)

**Funcionalidades:**
- Drag-and-drop entre colunas
- Clique para expandir detalhes e adicionar notas
- Badge de prazo (verde = no prazo, amarelo = amanhã, vermelho = atrasada)
- Contador de tarefas por coluna
- Notificação quando uma tarefa é atribuída

### 4.6 Página do Cliente (Admin)

Visão completa de um cliente específico, com abas:

**Aba "Visão Geral":**
- Status (onboarding / ativo / pausado / churned)
- Barra de progresso do onboarding
- Dados do cliente e contato
- Link do portal público (copiável)
- Responsável
- Timeline de atividades recentes

**Aba "Tarefas":**
- Kanban filtrado só por este cliente
- Botão para criar tarefa avulsa

**Aba "Briefing":**
- Visualização do briefing preenchido (ou status "pendente")
- Botão para reenviar lembrete ao cliente

**Aba "Contrato":**
- Status do contrato (rascunho / enviado / visualizado / assinado / expirado)
- **Builder de contrato** (se ainda não existe contrato):
  - Selecionar pacote pré-definido OU montar serviço a serviço
  - Para cada serviço: nome, descrição, preço (editável), tipo (mensal/único)
  - Toggle "Inclui implementação" → abre campos de valor e descrição da implementação
  - Prazo do contrato (meses), dia de vencimento, forma de pagamento
  - Cláusulas automáticas (geradas pelos serviços selecionados)
  - Campo para cláusulas customizadas (texto livre)
  - Preview do contrato antes de enviar
  - Botão "Gerar PDF e Enviar ao Cliente"
- **Após envio:** timeline de eventos (enviou → abriu → assinou) com timestamps
- Download do PDF gerado
- Dados preenchidos pelo cliente (razão social, CNPJ/CPF, endereço)
- Registro da assinatura (IP, data/hora, nome digitado, documento conferido)

**Aba "Relatórios":**
- Lista de relatórios do cliente
- Botão para criar novo relatório
- Status de cada relatório (rascunho / publicado / enviado)

**Aba "Configurações":**
- IDs do Meta Ads (ad account, pixel)
- Link do grupo WhatsApp
- Configurações do SDR de IA

### 4.7 Portal do Cliente (Público)

**URL:** `app.adriacrm.com.br/portal/[token]`

O cliente acessa via link único (sem necessidade de login — protegido por token + senha simples opcional).

**O que o cliente vê:**

1. **Boas-vindas** — mensagem personalizada com nome da empresa
2. **Progresso do onboarding** — barra visual + checklist do que falta ele fazer
3. **Briefing** — formulário step-by-step (se ainda não preencheu)
4. **Contrato** — fluxo completo de aceite digital (detalhado abaixo)
5. **Relatórios** — quando publicados, aparecem aqui com visualização bonita
6. **Status** — visão simplificada das etapas concluídas

**Fluxo de Contrato no Portal (visão do cliente):**

```
PASSO 1 — VISUALIZAÇÃO DO CONTRATO
───────────────────────────────────
O cliente vê o contrato completo renderizado em HTML (não PDF):
- Dados da Adria (contratada)
- Serviços contratados com descrição e valores
- Valor mensal total e valor de implementação (se houver)
- Forma de pagamento e vencimento
- Prazo do contrato
- Todas as cláusulas (gerais + específicas dos serviços + customizadas)
- Multas e penalidades

Botão: "Prosseguir para aceite →"

PASSO 2 — DADOS DO CONTRATANTE
───────────────────────────────
Formulário para o cliente preencher:
- Nome completo / Razão social
- CPF ou CNPJ (com validação e máscara)
- Endereço completo (com busca por CEP via ViaCEP API)

PASSO 3 — ACEITE DIGITAL
─────────────────────────
- Checkbox: "Li e concordo com todos os termos deste contrato"
- Campo para digitar o nome completo (assinatura)
- Campo para digitar CPF/CNPJ (conferência)
- Texto legal: "Ao clicar em 'Assinar Contrato', você está 
  concordando eletronicamente com todos os termos acima. 
  Este aceite tem validade jurídica conforme Art. 107 do 
  Código Civil e MP 2.200-2/2001."
- Botão: "Assinar Contrato ✓"

PASSO 4 — CONFIRMAÇÃO
─────────────────────
- Mensagem de sucesso
- Download do PDF do contrato assinado
- Próximo passo: preencher o briefing (se ainda não fez)
```

**Ao assinar, o sistema registra:**
- Timestamp exato (com timezone)
- IP do cliente
- User Agent (navegador)
- Nome digitado e documento conferido
- Hash do conteúdo do contrato (prova de que o texto não mudou)

**Design do portal:**
- Clean, minimalista, profissional
- Cores da Adria (azul escuro + branco)
- Mobile-first (cliente vai acessar pelo celular)
- Sem jargão técnico — linguagem simples

### 4.8 Relatórios de Performance

**Criação manual (MVP):**

O operador preenche um formulário com:
- Período (ex: 01/04 a 30/04)
- Métricas de ads (gasto, impressões, cliques, leads, CPL)
- Métricas de CRM (leads contatados, qualificados, agendamentos)
- Destaques do período
- Pontos de melhoria
- Próximas ações

**O sistema gera:**
- Visualização bonita no portal do cliente
- Cards com métricas principais e variação vs. mês anterior
- Gráficos simples (barras para comparação, linha para evolução)

### 4.9 Notificações

**In-app (badge no sino):**
- Nova tarefa atribuída a você
- Tarefa atrasada (lembrete diário)
- Cliente preencheu briefing
- Cliente assinou contrato
- Relatório aprovado e pronto para enviar

**Plano futuro (Fase 2 — via Evolution API):**
- Mesmas notificações enviadas no WhatsApp pessoal do operador

### 4.10 Módulo de Contratos

O módulo de contratos é o coração comercial do sistema. Ele permite criar contratos totalmente customizados por cliente, com geração automática de PDF e aceite digital.

**Fluxo completo:**

```
ADMIN: Cadastra cliente
    ↓
ADMIN: Monta o contrato (Contract Builder)
    ↓
    ├── Opção A: Seleciona pacote pré-definido (ex: "Geração de Demanda")
    │   → Serviços e preços já vêm preenchidos, admin pode ajustar
    │
    └── Opção B: Monta serviço a serviço do catálogo
        → Seleciona cada serviço, define preço customizado
    ↓
ADMIN: Configura termos
    ├── Toggle "Inclui implementação?" → SIM → Define valor e escopo
    ├── Prazo do contrato (meses)
    ├── Forma de pagamento e dia de vencimento
    └── Cláusulas customizadas (opcionais)
    ↓
SISTEMA: Monta o contrato automaticamente
    ├── Dados da Adria (contratada) → pré-preenchidos
    ├── Serviços selecionados com preços e descrições
    ├── Cláusulas gerais (padrão de todo contrato)
    ├── Cláusulas específicas (uma por serviço selecionado)
    ├── Cláusulas customizadas (texto livre do admin)
    └── Termos financeiros (multas, juros, rescisão)
    ↓
ADMIN: Faz preview → Aprova → Clica "Enviar ao Cliente"
    ↓
SISTEMA: Gera PDF → Envia link do portal ao cliente
    ↓
CLIENTE: Acessa portal → Lê contrato → Preenche dados → Assina digitalmente
    ↓
SISTEMA: Registra assinatura (IP, timestamp, dados) → Notifica admin
    ↓
SISTEMA: Marca tarefa de onboarding "contrato assinado" como concluída
```

**Contract Builder (UI do admin):**

```
┌─────────────────────────────────────────────────────┐
│  📝 Novo Contrato — Café Beltrão                    │
│─────────────────────────────────────────────────────│
│                                                     │
│  PACOTE RÁPIDO (opcional):                          │
│  [Geração de Demanda ▼] → Preenche tudo abaixo     │
│                                                     │
│  ─── SERVIÇOS ──────────────────────────────────    │
│  ✅ Gestão de Tráfego Pago        R$ 800,00/mês    │
│  ✅ AdriaCRM (Licença)             R$ 400,00/mês    │
│  ✅ SDR de IA (WhatsApp)           R$ 300,00/mês    │
│  ☐ Gestão Google Ads               R$ 600,00/mês   │
│  ☐ Criação de Conteúdo             R$ 500,00/mês   │
│  ☐ Consultoria Estratégica         R$ 800,00/mês   │
│                                                     │
│  ─── IMPLEMENTAÇÃO ─────────────────────────────    │
│  [✅] Inclui implementação                          │
│  Valor: R$ 2.500,00 (pagamento único)               │
│  Descrição: Setup de conta, pixel, campanhas         │
│  iniciais, configuração do CRM e SDR de IA.          │
│                                                     │
│  ─── TERMOS ────────────────────────────────────    │
│  Prazo: [12] meses                                  │
│  Vencimento: dia [10] de cada mês                   │
│  Pagamento: [PIX ▼]                                 │
│  Renovação automática: [✅]                          │
│                                                     │
│  ─── RESUMO ────────────────────────────────────    │
│  💰 Mensal: R$ 1.500,00                             │
│  💼 Implementação: R$ 2.500,00                       │
│  📅 Vigência: 12 meses                              │
│                                                     │
│  [Preview] [Salvar Rascunho] [Gerar e Enviar →]    │
└─────────────────────────────────────────────────────┘
```

**Catálogo de serviços (seed data):**

| Serviço | Categoria | Preço Base | Tipo | Cláusulas Vinculadas |
|---------|-----------|------------|------|---------------------|
| Gestão de Tráfego Pago (Meta Ads) | recurring | R$ 800 | monthly | Escopo de gestão, investimento de mídia por conta do cliente, relatórios mensais |
| AdriaCRM (Licença + Suporte) | recurring | R$ 400 | monthly | Disponibilidade, SLA de suporte, dados pertencem ao cliente |
| SDR de IA (WhatsApp) | recurring | R$ 300 | monthly | Limites de mensagens, qualidade de resposta, supervisão humana |
| Gestão Google Ads | recurring | R$ 600 | monthly | Escopo de gestão, investimento separado |
| Criação de Conteúdo Mensal | recurring | R$ 500 | monthly | Quantidade de peças, revisões, direitos autorais |
| Consultoria Estratégica | recurring | R$ 800 | monthly | Reuniões mensais, escopo de consultoria |
| Implementação Padrão | one_time | R$ 2.500 | one_time | Prazo de entrega, escopo de setup, treinamento |
| Implementação Avançada | one_time | R$ 5.000 | one_time | Escopo estendido, integrações customizadas |
| Landing Page | one_time | R$ 1.500 | one_time | Entrega, revisões, hospedagem |

**Cláusulas automáticas (template de contrato):**

O contrato é montado automaticamente combinando:

1. **Cláusulas gerais** (presentes em todo contrato):
   - Objeto do contrato
   - Obrigações da contratada (Adria)
   - Obrigações do contratante (cliente)
   - Condições de pagamento
   - Multa por atraso (2% + 1%/mês)
   - Prazo e renovação
   - Rescisão e multa rescisória (20%)
   - Confidencialidade
   - LGPD e proteção de dados
   - Foro (Campo Grande/MS)

2. **Cláusulas específicas por serviço** (carregadas do `service_catalog.contract_clauses`):
   - Ex: Se tiver "Tráfego Pago" → adiciona cláusula sobre investimento de mídia ser por conta do cliente
   - Ex: Se tiver "SDR de IA" → adiciona cláusula sobre limites e supervisão humana

3. **Cláusulas customizadas** (texto livre do admin):
   - Para situações específicas do cliente

### 4.11 Módulo de Cobrança Automática (Asaas)

O módulo de cobrança elimina toda gestão financeira manual. Ao assinar o contrato, a cobrança recorrente é criada automaticamente no Asaas. Pagamentos, atrasos, lembretes e suspensões acontecem sem intervenção humana.

**Integração escolhida: Asaas**
- API REST brasileira, compatível com qualquer linguagem
- Suporta PIX, boleto e cartão de crédito
- Cobrança recorrente nativa (assinatura)
- Webhooks para eventos de pagamento em tempo real
- Notificações automáticas ao cliente (email, SMS, WhatsApp)
- 30 transações PIX gratuitas/mês (suficiente para até 30 clientes)
- Taxas: R$ 0,99/PIX (promo 3 meses), R$ 1,99 depois

**Fluxo completo:**

```
CLIENTE ASSINA CONTRATO NO PORTAL
    ↓
SISTEMA: Cria customer no Asaas (nome, CPF/CNPJ, email, telefone)
    ↓
SISTEMA: Verifica se tem implementação (has_implementation = true)
    ├── SIM → Cria cobrança avulsa de implementação (PIX/boleto)
    │         Aguarda pagamento antes de iniciar onboarding técnico
    └── NÃO → Pula direto pra assinatura
    ↓
SISTEMA: Cria subscription (assinatura recorrente) no Asaas
    ├── Valor: total_monthly_value do contrato
    ├── Vencimento: dia definido no contrato
    ├── Método: PIX (padrão) ou conforme contrato
    ├── Multa: 2% + 1%/mês de juros (padrão)
    └── Ciclo: mensal, por X meses (contract_months)
    ↓
ASAAS: Gera primeira cobrança automaticamente
    ↓
ASAAS: Envia fatura ao cliente (email) com link de pagamento + QR PIX
    ↓
SISTEMA: Salva payment_url, pix_qr_code, pix_copy_paste na billing_invoices
    ↓
                    ┌─────────────────────────┐
                    │  CLIENTE PAGOU?          │
                    ├─────────┬───────────────┤
                    │ SIM     │ NÃO           │
                    ↓         ↓               │
        Webhook →  Status    Régua de         │
        CONFIRMED  'received' cobrança ──────→│
        ↓                    ↓               │
    Notifica admin      Dia +1: lembrete     │
    Registra evento     Dia +3: lembrete     │
    Tudo normal         Dia +7: alerta admin │
                        Dia +15: PAUSA       │
                        serviço automatica   │
                        ↓                    │
                    Status do cliente        │
                    muda pra 'paused'        │
                    Tarefas recorrentes      │
                    param de ser geradas     │
                    Notifica admin + cliente  │
                    ↓                        │
                    Se pagar depois:          │
                    Webhook → RECEIVED        │
                    Status volta 'active'     │
                    Tarefas retomam           │
                    └────────────────────────┘
```

**Dashboard financeiro (dentro do AgencyOS):**

```
┌──────────────────────────────────────────────────────┐
│  💰 FINANCEIRO                                       │
│──────────────────────────────────────────────────────│
│                                                      │
│  MRR: R$ 9.000    │  Inadimplência: R$ 1.500 (1)   │
│  Recebido este mês: R$ 7.500  │  A receber: R$ 3.000│
│                                                      │
│  ─── COBRANÇAS DO MÊS ──────────────────────────    │
│                                                      │
│  ✅ Café Beltrão       R$ 1.500  Pago 05/04  PIX    │
│  ✅ Oficina Renovação  R$ 1.800  Pago 08/04  Boleto │
│  ⏳ Cliente Novo       R$ 1.500  Vence 10/04  -     │
│  🔴 Cliente X          R$ 1.500  Atrasado 12d       │
│  ✅ Cliente Y           R$ 1.500  Pago 02/04  PIX   │
│  ⏳ Cliente Z          R$ 1.200  Vence 15/04  -     │
│                                                      │
│  [Ver todas as cobranças]  [Criar cobrança avulsa]   │
└──────────────────────────────────────────────────────┘
```

**Página do cliente — aba "Financeiro":**

- Histórico completo de faturas (status, valor, data de pagamento)
- Assinatura ativa (valor, método, próximo vencimento)
- Botão "Enviar lembrete manual" (via WhatsApp)
- Botão "Pausar cobrança" / "Retomar cobrança"
- Botão "Criar cobrança avulsa" (para serviços adicionais)
- Indicador visual de saúde financeira do cliente (em dia / alerta / inadimplente)

**Portal do cliente — seção "Financeiro":**

O cliente vê no portal público:
- Próxima fatura (valor, vencimento, botão de pagamento PIX/boleto)
- QR Code PIX direto na tela (copia e cola disponível)
- Histórico de pagamentos
- Status da assinatura

**Régua de cobrança automática (via Asaas + Evolution API):**

```
ANTES DO VENCIMENTO:
  Dia -3: Email (Asaas nativo) → "Sua fatura vence em 3 dias"
  Dia -1: WhatsApp (Evolution API) → "Oi [Nome], amanhã vence 
           sua fatura de R$ 1.500. Pague via PIX: [link]"

NO VENCIMENTO:
  Dia 0: Email (Asaas) → Fatura com link de pagamento
         WhatsApp (Evolution) → QR Code PIX direto no chat

APÓS VENCIMENTO:
  Dia +1: Email (Asaas) → "Sua fatura venceu ontem"
  Dia +3: WhatsApp (Evolution) → "Oi [Nome], notamos que a fatura 
           de R$ 1.500 está pendente. Podemos ajudar? [link]"
  Dia +7: WhatsApp (Evolution) → Mensagem mais direta + 
           Notificação ao admin: "Cliente X com 7 dias de atraso"
  Dia +15: SISTEMA → Pausa automática do serviço
           WhatsApp → "Oi [Nome], por conta da pendência financeira,
           seus serviços foram temporariamente pausados. 
           Regularize para retomar: [link]"
           Notificação urgente ao admin
```

**Webhook do Asaas (recebe eventos de pagamento):**

```
POST /api/webhooks/asaas

Eventos tratados:
- PAYMENT_CONFIRMED    → Marca fatura como paga, registra evento
- PAYMENT_RECEIVED     → Confirma compensação
- PAYMENT_OVERDUE      → Marca como vencida, inicia régua de cobrança
- PAYMENT_REFUNDED     → Registra estorno
- PAYMENT_DELETED      → Marca como cancelada
- SUBSCRIPTION_CREATED → Salva asaas_subscription_id
- SUBSCRIPTION_UPDATED → Atualiza status
- SUBSCRIPTION_DELETED → Marca como cancelada
```

**Ações automáticas vinculadas ao pagamento:**

| Evento | Ação no AgencyOS |
|--------|-----------------|
| Contrato assinado | Cria customer + subscription no Asaas |
| Implementação paga | Libera tarefas de onboarding técnico (Etapa 2) |
| Primeira mensalidade paga | Confirma que o cliente está "de verdade" |
| Fatura paga no mês | Ícone verde no card do cliente |
| Fatura vencida +7 dias | Alerta no dashboard do admin |
| Fatura vencida +15 dias | Pausa serviço automaticamente |
| Pagamento após pausa | Retoma serviço + gera tarefas atrasadas |
| Cliente cancela | Dispara offboarding (revogar acessos, backup de dados) |

**Configuração (tela de settings):**

O admin configura uma vez:
- API Key do Asaas (sandbox para teste, production quando estiver pronto)
- CNPJ e dados da empresa
- Método de pagamento padrão
- Régua de cobrança (quais dias notificar)
- Após quantos dias pausar serviço
- URL do webhook (auto-gerada pelo sistema)

### 4.12 Gerador de Propostas Comerciais

Antes do contrato, você envia uma proposta visual e profissional. Se o prospect aceita, ela se converte em contrato automaticamente — sem redigitar nada.

**Fluxo:**

```
ADMIN: Cria proposta (formulário ou a partir de template)
    ↓
    ├── Dados do prospect (nome, empresa, telefone, email)
    ├── Texto de abertura personalizado (o "diagnóstico")
    ├── Seleciona serviços do catálogo (mesmo do contrato)
    ├── Adiciona cases/resultados de clientes anteriores
    ├── Define validade (ex: 7 dias)
    └── Condições especiais (desconto, bônus)
    ↓
SISTEMA: Gera link público da proposta (portal/proposta/[token])
    ↓
ADMIN: Envia link via WhatsApp ao prospect
    ↓
PROSPECT: Abre a proposta (status → 'viewed', notifica admin)
    ↓
PROSPECT: Clica "Aceitar proposta" 
    ↓
SISTEMA: 
    ├── Cria client a partir dos dados do prospect
    ├── Cria contract com os serviços da proposta
    ├── Redireciona pro portal do contrato (assinar)
    ├── Status da proposta → 'converted'
    └── Dispara onboarding automaticamente

    OU

PROSPECT: Clica "Tenho dúvidas" → abre WhatsApp direto
PROSPECT: Não responde → após validade → status 'expired'
```

**Página pública da proposta (o que o prospect vê):**

- Header com logo da Adria
- Saudação personalizada: "Olá [Nome], preparamos essa proposta para [Empresa]"
- Seção "Diagnóstico": o problema identificado
- Seção "Nossa solução": serviços propostos com descrição e valor
- Seção "Resultados": cases de clientes (com números reais)
- Resumo financeiro: mensal + implementação + condições
- Validade da proposta
- Botões: "Aceitar proposta" / "Tenho dúvidas"
- Design: clean, mobile-first, com animações sutis de entrada

**Na listagem de propostas (admin):**

- Pipeline visual: Rascunho → Enviada → Visualizada → Aceita/Recusada/Expirada
- Filtros por status, data, valor
- Taxa de conversão (aceitas / total)
- Tempo médio de resposta

### 4.13 Health Score do Cliente

Score automático de 0-100 que indica a "saúde" de cada cliente. Calculado semanalmente via cron job. Quando cai, gera alerta antes do churn acontecer.

**Dimensões do score (peso entre parênteses):**

```
HEALTH SCORE = média ponderada de 5 dimensões

📊 Performance (30%)
   └── CPL está melhorando ou piorando?
   └── CTR acima ou abaixo do benchmark do segmento?
   └── Orçamento sendo utilizado (>80%)?
   └── Leads gerados vs meta do cliente

💰 Financeiro (25%)
   └── Faturas pagas em dia (últimos 3 meses)
   └── Tem fatura vencida agora?
   └── Histórico de atrasos

🤝 Engajamento (20%)
   └── Visitou o portal nos últimos 30 dias?
   └── Tempo médio pra aprovar criativos
   └── Responde no grupo de WhatsApp?
   └── Último contato há quantos dias?

✅ Execução (15%)
   └── Tarefas do operador no prazo?
   └── Onboarding foi concluído em até 14 dias?
   └── Tarefas bloqueadas (esperando o cliente)?

😊 Satisfação (10%)
   └── Último NPS (se disponível)
   └── Feedback direto
   └── Reclamações registradas
```

**Classificação:**

| Score | Status | Cor | Ação |
|-------|--------|-----|------|
| 70-100 | Saudável | 🟢 Verde | Manter e buscar upsell |
| 40-69 | Atenção | 🟡 Amarelo | Reunião de alinhamento |
| 0-39 | Crítico | 🔴 Vermelho | Intervenção urgente do admin |

**Onde aparece:**

- Card de cada cliente (badge colorido com o score)
- Dashboard do admin (lista de clientes ordenados por score, piores primeiro)
- Notificação quando score cai de "saudável" para "atenção"
- Notificação urgente quando cai para "crítico"

### 4.14 SLA e Performance do Time

Métricas objetivas do operador — base para a futura sociedade e para escalar o time.

**Métricas rastreadas automaticamente:**

```
DIÁRIAS (calculadas no fim do dia via cron):
  - Tarefas completadas
  - Tarefas completadas no prazo vs atrasadas
  - Clientes atendidos (interações)
  - Tempo médio de resposta (se integrado com WhatsApp)

MENSAIS (consolidado):
  - Taxa de conclusão no prazo (meta: ≥ 90%)
  - Tempo médio de conclusão por tipo de tarefa
  - Clientes gerenciados
  - Relatórios entregues no prazo
  - Briefings processados no prazo
```

**SLA padrão da agência (configurável):**

| SLA | Meta | Como mede |
|-----|------|-----------|
| Tarefas no prazo | ≥ 90% | tasks_on_time / tasks_completed |
| Tempo de resposta ao cliente | ≤ 60 min (horário comercial) | avg_response_time_minutes |
| Relatório mensal entregue | Até dia 5 do mês seguinte | tarefa concluída no prazo |
| Criativos entregues | Até 48h após briefing | tempo entre criação da tarefa e conclusão |

**Dashboard de performance:**

```
┌──────────────────────────────────────────────────────┐
│  👤 PERFORMANCE — Felipe (Operador)     Abril/2026   │
│──────────────────────────────────────────────────────│
│                                                      │
│  Taxa no prazo: 92% ✅    │  Clientes: 5            │
│  Tempo médio: 4.2h        │  Tarefas/mês: 47        │
│                                                      │
│  ─── EVOLUÇÃO ───────────────────────────────────    │
│  Jan: 78% → Fev: 83% → Mar: 88% → Abr: 92% 📈     │
│                                                      │
│  ─── SLA DO MÊS ────────────────────────────────    │
│  ✅ Tarefas no prazo (92% ≥ 90%)                     │
│  ✅ Relatórios entregues (5/5)                        │
│  ⚠️ Tempo de resposta (72min > 60min)                │
│                                                      │
│  ─── POR CLIENTE ────────────────────────────────    │
│  Café Beltrão:     12 tarefas, 100% no prazo        │
│  Oficina Renovação: 10 tarefas, 90% no prazo        │
│  Cliente Novo:      8 tarefas, 87% no prazo ⚠️      │
└──────────────────────────────────────────────────────┘
```

### 4.15 Biblioteca de Assets

Repositório centralizado por cliente. Todo material da marca, criativos e documentos ficam organizados e acessíveis — inclusive para novos membros do time.

**Categorias:**

| Categoria | O que guarda | Quem envia |
|-----------|-------------|------------|
| Logo | Logos PNG, SVG, variações | Cliente (portal) ou operador |
| Brand Guide | Manual de marca, paleta, fontes | Cliente (portal) |
| Fotos | Fotos do negócio, produtos, equipe | Cliente (portal) ou operador |
| Vídeos | Vídeos para ads, reels, stories | Cliente ou operador |
| Criativos | Imagens de ads, carrosséis, stories | Operador |
| Copies | Textos de ads, scripts, headlines | Operador |
| Documentos | Contratos, briefings, relatórios | Sistema (automático) |

**Funcionalidades:**

- Upload com drag-and-drop (múltiplos arquivos)
- Preview de imagens e vídeos inline
- Tags livres para busca rápida (ex: "stories", "campanha-junho")
- Filtro por categoria e tags
- Versionamento: ao subir uma versão nova de um criativo, vincula ao anterior
- **Fluxo de aprovação**: operador sobe criativo → marca como "pendente aprovação" → aparece no portal do cliente → cliente aprova ou rejeita com nota
- Supabase Storage com pasta por cliente: `assets/{client_id}/{category}/`
- Cliente pode enviar fotos/vídeos pelo portal (alimenta a biblioteca automaticamente)

**Na página do cliente (aba "Assets"):**

- Grid de preview com filtros por categoria
- Botão de upload
- Indicador de aprovação pendente
- Botão "Solicitar material ao cliente" → gera tarefa + notificação no portal

**No portal do cliente:**

- Seção "Materiais" onde ele pode enviar arquivos
- Seção "Aprovações" com criativos pendentes de OK

### 4.16 Forecast de Receita

Visão financeira da agência com projeções. Responde a pergunta: "quanto vou faturar nos próximos 3 meses?"

**Métricas do dashboard financeiro expandido:**

```
┌──────────────────────────────────────────────────────┐
│  📈 FORECAST DE RECEITA                              │
│──────────────────────────────────────────────────────│
│                                                      │
│  MRR ATUAL: R$ 9.000          CLIENTES ATIVOS: 6    │
│  MRR PROJETADO (3 meses): R$ 12.000                 │
│                                                      │
│  ─── RECEITA MENSAL ─────────────────────────────    │
│  [gráfico de barras: últimos 6 meses + 3 projetados]│
│                                                      │
│  ─── RISCOS ─────────────────────────────────────    │
│  ⚠️ 1 contrato expira em 30 dias (Café Beltrão)     │
│  🔴 1 cliente com health score crítico               │
│  💰 R$ 1.500 em faturas vencidas                     │
│                                                      │
│  ─── PIPELINE ───────────────────────────────────    │
│  📋 2 propostas enviadas (R$ 3.000 potencial)        │
│  📋 1 proposta visualizada (R$ 1.500)                │
│                                                      │
│  ─── PROJEÇÃO ───────────────────────────────────    │
│  Mai/26: R$ 9.000 (base) + R$ 1.500 (pipeline) 🟡  │
│  Jun/26: R$ 10.500 (base) - R$ 1.500 (churn risk)  │
│  Jul/26: R$ 9.000 (conservador)                     │
└──────────────────────────────────────────────────────┘
```

**Como calcula as projeções:**

- **MRR base**: soma dos `monthly_value` de todos os clientes ativos
- **Contratos expirando**: contratos com `end_date` nos próximos 90 dias (risco se auto_renew = false)
- **Risco de churn**: clientes com health score "crítico" multiplicado por probabilidade
- **Pipeline**: propostas com status "enviada" ou "visualizada" multiplicado por taxa histórica de conversão
- **Receita projetada**: MRR base + pipeline provável - churn provável

**Dados que alimentam o forecast (automáticos):**

| Fonte | Dado |
|-------|------|
| contracts | Valores mensais, datas de expiração, renovação auto |
| proposals | Pipeline de novas vendas, taxa de conversão |
| client_health_scores | Probabilidade de churn |
| billing_invoices | Inadimplência, receita efetiva recebida |
| client_billing | Valores reais cobrados vs contratuais |

---

## 5. Funcionalidades — Fase 2 (Evolution API)

### 5.1 Criação Automática de Grupo WhatsApp

**Trigger:** Ao cadastrar novo cliente (ou via botão manual).

**O sistema:**
1. Cria um grupo na Evolution API com nome padronizado: `[Adria] Cliente — Geração de Demanda`
2. Adiciona os números: Matheus, operador, contato do cliente
3. Envia mensagem de boas-vindas automática:

```
👋 Olá [Nome]! Bem-vindo(a) à Adria.

Este é o grupo exclusivo para acompanharmos sua estratégia 
de geração de demanda. Aqui você receberá:

📊 Relatórios semanais e mensais
📋 Aprovações de criativos e copies  
💬 Comunicação direta com nossa equipe

Seu portal de acompanhamento: [link do portal]

Qualquer dúvida, é só chamar. Vamos juntos! 🚀
```

4. Salva o `whatsapp_group_id` no banco
5. Marca tarefa de onboarding como concluída

### 5.2 Envio Automático de Relatórios via WhatsApp

**Trigger:** Quando admin publica um relatório e clica "Enviar via WhatsApp".

**O sistema:**
1. Gera uma imagem/card resumo do relatório (usando html-to-image ou similar)
2. Envia no grupo do cliente via Evolution API:

```
📊 Relatório de Performance — [Mês/Ano]

💰 Investido: R$ X.XXX
👀 Impressões: XX.XXX  
🖱 Cliques: X.XXX
📱 Leads: XXX
💵 Custo por Lead: R$ XX,XX

📈 Veja o relatório completo no seu portal:
[link do portal]/reports

Dúvidas? Responde aqui que a gente conversa. 😊
```

3. Atualiza status do relatório para `sent`
4. Registra no activity_log

### 5.3 Lembretes Automáticos para Clientes

**Via WhatsApp (Evolution API) — disparos automáticos:**

- **Briefing não preenchido** (dia 2): "Oi [Nome]! Pra gente começar a rodar suas campanhas, precisamos das informações do briefing. Leva menos de 10 minutos: [link]"
- **Contrato pendente** (dia 3): "Oi [Nome]! Pra formalizar nossa parceria, o contrato está pronto pra aceite: [link]"
- **Briefing não preenchido** (dia 5, último): "Oi [Nome], sem as informações do briefing não conseguimos avançar com as campanhas. Pode preencher hoje? [link]"

---

## 6. Funcionalidades — Fase 3 (Meta API + IA)

### 6.1 Métricas Automáticas do Meta Ads

Integração com Meta Marketing API para puxar dados automaticamente:
- Ao cadastrar o `meta_ad_account_id` do cliente, o sistema puxa métricas diárias via cron job
- Dados alimentam os relatórios automaticamente
- Dashboard do cliente mostra métricas em tempo real

### 6.2 Análise por IA

Usando API do Claude para gerar análises:
- Ao criar um relatório, botão "Gerar análise com IA"
- A IA recebe as métricas do período + histórico e gera:
  - Resumo executivo em linguagem simples
  - Pontos de atenção
  - Sugestões de otimização
  - Comparação com período anterior

### 6.3 SDR Performance Dashboard

Métricas do agente de IA do AdriaCRM por cliente:
- Mensagens enviadas/recebidas
- Leads qualificados pelo SDR
- Taxa de agendamento
- Tempo médio de resposta

---

## 7. Regras de Negócio

### 7.1 Onboarding

- O onboarding é considerado completo quando **todas as tarefas de onboarding** estão com status `done`
- O `onboarding_progress` é calculado como: `(tarefas done / total de tarefas onboarding) * 100`
- Quando atinge 100%, o status do cliente muda automaticamente para `active`
- O campo `activated_at` é preenchido neste momento

### 7.2 Tarefas

- Tarefas recorrentes só são geradas para clientes com status `active`
- Tarefas com `depends_on` só podem ser movidas para `in_progress` quando a dependência está `done`
- Tarefas atrasadas (due_date < hoje e status != done) recebem prioridade `urgent` automaticamente
- O admin pode criar tarefas avulsas a qualquer momento

### 7.3 Relatórios

- Relatórios só ficam visíveis no portal do cliente quando `visible_to_client = true`
- O admin precisa aprovar (mudar status para `published`) antes de enviar
- Variação vs. mês anterior é calculada automaticamente se houver relatório anterior

### 7.4 Portal do Cliente

- Acesso via `public_token` (URL única por cliente)
- Opcionalmente protegido por senha simples (não é auth completo)
- Cliente não tem acesso a dados de outros clientes
- Cliente não vê tarefas internas (apenas o progresso geral)

---

## 8. Seeds — Dados Iniciais

### 8.1 Templates de Tarefas de Onboarding

Ao fazer deploy, popular `task_templates` com os 20+ templates listados na seção 4.3 (Fluxo de Onboarding).

### 8.2 Templates de Tarefas Recorrentes

Popular com os templates semanais e mensais listados na seção 4.4.

### 8.3 Organização e Admin

Criar organização "Adria" e perfil admin para Matheus.

### 8.4 Catálogo de Serviços

Popular `service_catalog` com os 9 serviços listados na seção 4.10 (Módulo de Contratos), incluindo cláusulas vinculadas em JSON.

### 8.5 Pacotes Pré-definidos

Popular `service_packages` com pelo menos:
- **Geração de Demanda** (R$ 1.500/mês) → Tráfego Pago + AdriaCRM + SDR de IA
- **Geração de Demanda + Google** (R$ 2.100/mês) → Tráfego Pago + Google Ads + AdriaCRM + SDR de IA
- **Pacote Completo** (R$ 2.800/mês) → Todos os serviços recorrentes

### 8.6 Cláusulas Contratuais Padrão

Popular as cláusulas gerais do contrato como constantes no código (não no banco), incluindo todos os textos legais referenciados na seção 4.10.

---

## 9. UI/UX — Diretrizes

### 9.1 Design System

- **Cores principais:** Azul escuro (#1a1a2e), Azul Adria (#4A90D9), Branco (#FFFFFF)
- **Cores de status:** Verde (#22c55e), Amarelo (#eab308), Vermelho (#ef4444), Cinza (#94a3b8)
- **Fonte:** Inter (sans-serif)
- **Componentes:** shadcn/ui como base
- **Ícones:** Lucide React
- **Layout:** Sidebar fixa à esquerda (desktop), bottom nav (mobile)
- **Tema:** Dark mode como padrão (dashboard), Light mode no portal do cliente

### 9.2 Princípios

- **Mobile-first** — o operador vai usar no celular frequentemente
- **Informação > decoração** — cada pixel deve comunicar algo útil
- **Ação em 1 clique** — as ações mais comuns devem estar sempre visíveis
- **Zero ambiguidade** — o operador nunca deve se perguntar "o que eu faço agora?"

### 9.3 Componentes Chave

**Client Card (na lista de clientes):**
```
┌─────────────────────────────────────────┐
│  ☕ Café Beltrão                   🟢 Ativo │
│  João Silva · (67) 99141-8064           │
│  ─────────────────────────────────────  │
│  📊 3 tarefas pendentes · 1 atrasada    │
│  💰 R$ 1.500/mês · Desde 01/03/2026    │
│  👤 Operador: Felipe                    │
└─────────────────────────────────────────┘
```

**Task Card (no Kanban):**
```
┌─────────────────────────────────────────┐
│  🔴 URGENTE                             │
│  Revisar performance das campanhas      │
│  ☕ Café Beltrão                         │
│  ─────────────────────────────────────  │
│  👤 Felipe · 📅 Vence hoje              │
└─────────────────────────────────────────┘
```

---

## 10. Plano de Implementação

### Fase 1 — Core (Semanas 1-5)

**Semana 1: Fundação**
- Setup do projeto Next.js + Supabase + Tailwind + shadcn
- Schema do banco (rodar SQL completo)
- Autenticação (login admin/operador)
- Layout base (sidebar, header, routing)
- CRUD de clientes (cadastrar, listar, visualizar)

**Semana 2: Motor de Tarefas + Contratos**
- Templates de tarefas (seed + CRUD)
- Geração automática de tarefas no cadastro de cliente
- Kanban de tarefas (drag-and-drop, filtros)
- Página do cliente com abas
- Cálculo automático de onboarding_progress
- Catálogo de serviços (CRUD + seed)
- Contract Builder (selecionar serviços, montar contrato)

**Semana 3: Portal + Propostas**
- Portal público do cliente (token-based)
- Formulário de briefing step-by-step
- Aceite digital de contrato (ler → dados → assinar)
- Geração de PDF do contrato
- Gerador de propostas comerciais
- Página pública da proposta (portal/proposta/[token])
- Conversão proposta → cliente + contrato
- Pipeline de propostas (listagem com status)

**Semana 4: Cobrança + Financeiro**
- Configuração do Asaas (tela de settings)
- Integração: criar customer + subscription no Asaas
- Webhook /api/webhooks/asaas (eventos de pagamento)
- Dashboard financeiro (MRR, cobranças, inadimplência)
- Aba "Financeiro" na página do cliente
- Portal do cliente: QR PIX, link pagamento, histórico
- Cobranças avulsas (implementação, adicionais)
- Forecast de receita (MRR projetado, contratos expirando, pipeline)

**Semana 5: Assets + Relatórios + Dashboard**
- Biblioteca de assets por cliente (upload, categorias, tags, preview)
- Fluxo de aprovação de criativos (operador → portal → cliente aprova/rejeita)
- Cliente envia materiais pelo portal
- CRUD de relatórios de performance
- Dashboard principal completo (admin + operador)
- Notificações in-app

### Fase 2 — WhatsApp + Cobrança Inteligente (Semanas 6-7)

- Integração com Evolution API
- Criação automática de grupo WhatsApp
- Envio de mensagens automáticas (boas-vindas, lembretes)
- Envio de relatórios via WhatsApp
- Régua de cobrança via WhatsApp (lembretes pré/pós vencimento)
- Notificação de serviço pausado via WhatsApp
- Notificações para operador via WhatsApp
- Lembrete de proposta não respondida via WhatsApp

### Fase 3 — Inteligência + Performance (Semanas 8-10)

- Integração com Meta Marketing API
- Métricas automáticas de ads
- Análise por IA (Claude API) nos relatórios
- Health score do cliente (cálculo semanal, alertas, badge)
- SLA e métricas do time (daily + monthly, dashboard de performance)
- Dashboard de performance do SDR
- Relatórios automáticos (preenchidos com dados da Meta API)
- Forecast de receita com churn prediction (baseado no health score)

---

## 11. Métricas de Sucesso

| Métrica | Meta |
|---------|------|
| Tempo de onboarding | < 14 dias (de cadastro até campanhas rodando) |
| Tarefas atrasadas | < 10% do total por semana |
| Briefings preenchidos | 100% até dia 3 |
| Contratos assinados | 100% até dia 3 |
| Inadimplência | < 10% do MRR |
| Relatórios enviados | 100% até dia 5 do mês seguinte |
| Clientes ativos | Crescimento de 2 → 6-7 em 90 dias |
| Dependência do Matheus | Operador resolver 80%+ das tarefas sozinho |

---

## 12. Considerações Finais

### Segurança
- Tokens de API (Meta, Evolution) armazenados com encryption no Supabase Vault
- RLS em todas as tabelas sensíveis
- Portal do cliente isolado por token único
- Logs de acesso e atividade

### Performance
- ISR (Incremental Static Regeneration) para portal do cliente
- Realtime do Supabase para atualizações de tarefas
- Queries otimizadas com indexes apropriados

### Escalabilidade
- Multi-tenant by design (organization_id em tudo)
- Se um dia quiser vender o AgencyOS como SaaS para outras agências, a estrutura já suporta

---

*Este PRD é um documento vivo. À medida que a operação evolui, ele deve ser atualizado.*
