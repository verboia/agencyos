-- =============================================================
-- Seeds — Organização Adria, catálogo, pacotes, templates
-- =============================================================

INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Adria', 'adria')
ON CONFLICT (slug) DO NOTHING;

-- Catálogo de serviços
INSERT INTO public.service_catalog (organization_id, name, slug, description, category, base_price, price_type, sort_order, contract_clauses) VALUES
('00000000-0000-0000-0000-000000000001', 'Gestão de Tráfego Pago (Meta Ads)', 'trafego-pago-meta', 'Criação, gestão e otimização de campanhas no Facebook e Instagram Ads.', 'recurring', 800, 'monthly', 1,
  '[{"order":100,"title":"CLÁUSULA ESPECÍFICA — GESTÃO DE TRÁFEGO PAGO","body":"A CONTRATADA fica responsável pela criação, monitoramento e otimização das campanhas publicitárias no Meta Ads. O investimento em mídia (verba de anúncios) é de responsabilidade exclusiva do CONTRATANTE, sendo pago diretamente à plataforma Meta. Relatórios de desempenho serão entregues mensalmente."}]'),
('00000000-0000-0000-0000-000000000001', 'AdriaCRM (Licença + Suporte)', 'adriacrm', 'Licença de uso do sistema AdriaCRM com suporte técnico.', 'recurring', 400, 'monthly', 2,
  '[{"order":101,"title":"CLÁUSULA ESPECÍFICA — LICENÇA ADRIACRM","body":"A CONTRATADA concede licença não exclusiva de uso do sistema AdriaCRM durante a vigência do contrato. Os dados inseridos pertencem ao CONTRATANTE. O SLA de suporte é de 4h úteis para chamados críticos e 24h úteis para chamados padrão."}]'),
('00000000-0000-0000-0000-000000000001', 'SDR de IA (WhatsApp)', 'sdr-ia', 'Agente de IA para qualificação e atendimento de leads via WhatsApp.', 'recurring', 300, 'monthly', 3,
  '[{"order":102,"title":"CLÁUSULA ESPECÍFICA — SDR DE IA","body":"O agente de IA contratado operará dentro dos limites de uso definidos na plataforma. O CONTRATANTE reconhece que a IA pode apresentar imprecisões eventuais e que a supervisão humana é recomendada. Limite de mensagens conforme plano."}]'),
('00000000-0000-0000-0000-000000000001', 'Gestão Google Ads', 'google-ads', 'Criação e gestão de campanhas no Google Ads.', 'recurring', 600, 'monthly', 4,
  '[{"order":103,"title":"CLÁUSULA ESPECÍFICA — GOOGLE ADS","body":"A CONTRATADA gere as campanhas no Google Ads. O investimento de mídia é de responsabilidade do CONTRATANTE e pago diretamente ao Google."}]'),
('00000000-0000-0000-0000-000000000001', 'Criação de Conteúdo Mensal', 'conteudo-mensal', 'Produção de 12 peças mensais para redes sociais.', 'recurring', 500, 'monthly', 5,
  '[{"order":104,"title":"CLÁUSULA ESPECÍFICA — CRIAÇÃO DE CONTEÚDO","body":"A CONTRATADA entregará mensalmente 12 peças de conteúdo. Revisões limitadas a 2 por peça. Direitos autorais transferidos ao CONTRATANTE após pagamento."}]'),
('00000000-0000-0000-0000-000000000001', 'Consultoria Estratégica', 'consultoria', 'Reuniões estratégicas mensais e acompanhamento.', 'recurring', 800, 'monthly', 6,
  '[{"order":105,"title":"CLÁUSULA ESPECÍFICA — CONSULTORIA","body":"A CONTRATADA entregará reunião estratégica mensal de até 90 minutos e suporte por mensagem entre as reuniões."}]'),
('00000000-0000-0000-0000-000000000001', 'Implementação Padrão', 'implementacao-padrao', 'Setup completo: conta de anúncios, pixel, CRM, SDR de IA.', 'one_time', 2500, 'one_time', 10,
  '[{"order":200,"title":"CLÁUSULA ESPECÍFICA — IMPLEMENTAÇÃO","body":"O escopo de implementação inclui: configuração de conta de anúncios, instalação de pixel, eventos de conversão, cadastro no CRM, treinamento inicial de 2h. Prazo de entrega: até 14 dias úteis após a assinatura e pagamento."}]'),
('00000000-0000-0000-0000-000000000001', 'Implementação Avançada', 'implementacao-avancada', 'Setup completo + integrações customizadas.', 'one_time', 5000, 'one_time', 11,
  '[{"order":201,"title":"CLÁUSULA ESPECÍFICA — IMPLEMENTAÇÃO AVANÇADA","body":"Escopo estendido incluindo integrações com sistemas do CONTRATANTE. Prazo de entrega conforme complexidade, até 30 dias úteis."}]'),
('00000000-0000-0000-0000-000000000001', 'Landing Page', 'landing-page', 'Criação de landing page otimizada para conversão.', 'one_time', 1500, 'one_time', 12,
  '[{"order":202,"title":"CLÁUSULA ESPECÍFICA — LANDING PAGE","body":"Entrega de uma landing page responsiva. Revisões limitadas a 3. Hospedagem por 12 meses inclusa. Após esse período, renovação será negociada."}]')
ON CONFLICT DO NOTHING;

-- Pacotes
INSERT INTO public.service_packages (organization_id, name, description, package_price, included_services, sort_order)
SELECT '00000000-0000-0000-0000-000000000001',
       'Máquina de Vendas',
       'Tráfego Pago + AdriaCRM + SDR de IA',
       1500,
       jsonb_build_array(
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='trafego-pago-meta' LIMIT 1), 'custom_price', NULL),
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='adriacrm' LIMIT 1), 'custom_price', NULL),
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='sdr-ia' LIMIT 1), 'custom_price', NULL)
       ),
       1
WHERE NOT EXISTS (SELECT 1 FROM public.service_packages WHERE name='Máquina de Vendas');

INSERT INTO public.service_packages (organization_id, name, description, package_price, included_services, sort_order)
SELECT '00000000-0000-0000-0000-000000000001',
       'Máquina de Vendas + Google',
       'Tráfego Meta + Google + AdriaCRM + SDR de IA',
       2100,
       jsonb_build_array(
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='trafego-pago-meta' LIMIT 1), 'custom_price', NULL),
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='google-ads' LIMIT 1), 'custom_price', NULL),
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='adriacrm' LIMIT 1), 'custom_price', NULL),
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='sdr-ia' LIMIT 1), 'custom_price', NULL)
       ),
       2
WHERE NOT EXISTS (SELECT 1 FROM public.service_packages WHERE name='Máquina de Vendas + Google');

INSERT INTO public.service_packages (organization_id, name, description, package_price, included_services, sort_order)
SELECT '00000000-0000-0000-0000-000000000001',
       'Pacote Completo',
       'Todos os serviços recorrentes',
       2800,
       jsonb_build_array(
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='trafego-pago-meta' LIMIT 1), 'custom_price', NULL),
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='google-ads' LIMIT 1), 'custom_price', NULL),
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='adriacrm' LIMIT 1), 'custom_price', NULL),
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='sdr-ia' LIMIT 1), 'custom_price', NULL),
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='conteudo-mensal' LIMIT 1), 'custom_price', NULL),
         jsonb_build_object('service_id', (SELECT id FROM public.service_catalog WHERE slug='consultoria' LIMIT 1), 'custom_price', NULL)
       ),
       3
WHERE NOT EXISTS (SELECT 1 FROM public.service_packages WHERE name='Pacote Completo');

-- Templates de tarefas de onboarding
INSERT INTO public.task_templates (organization_id, title, description, category, sort_order, default_assignee, default_due_days, auto_trigger) VALUES
('00000000-0000-0000-0000-000000000001', 'Enviar link do portal para o cliente', 'Copiar link do portal e enviar via WhatsApp.', 'onboarding', 1, 'operator', 0, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Cliente preencher briefing no portal', 'Acompanhar o preenchimento pelo cliente.', 'onboarding', 2, 'operator', 3, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Cliente assinar contrato no portal', 'Aguardar aceite digital.', 'onboarding', 3, 'operator', 3, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Revisar briefing preenchido', 'Revisar todas as respostas e validar com o cliente.', 'onboarding', 4, 'admin', 4, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Coletar acesso ao Business Manager do Meta', 'Solicitar parceria ou acesso direto.', 'onboarding', 5, 'operator', 3, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Coletar acesso ao Instagram / Facebook Page', 'Fazer parceria via BM.', 'onboarding', 6, 'operator', 3, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Coletar logo e materiais da marca', 'Upload no sistema.', 'onboarding', 7, 'operator', 3, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Criar conta de anúncios no Meta', 'Se o cliente não tiver.', 'onboarding', 8, 'operator', 5, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Instalar Pixel do Meta no site', 'Se tiver site.', 'onboarding', 9, 'operator', 5, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Configurar domínio de verificação', 'No BM.', 'onboarding', 10, 'operator', 5, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Configurar eventos de conversão', 'Leads, compras.', 'onboarding', 11, 'operator', 7, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Cadastrar cliente no AdriaCRM', 'Setup completo.', 'onboarding', 12, 'operator', 5, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Configurar SDR de IA no AdriaCRM', 'Treinar prompts.', 'onboarding', 13, 'admin', 7, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Criar grupo WhatsApp com cliente', 'Incluir Matheus, operador e cliente.', 'onboarding', 14, 'operator', 3, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Definir público-alvo e segmentação', 'Baseado no briefing.', 'onboarding', 15, 'admin', 7, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Definir orçamento diário de ads', 'Alinhar com cliente.', 'onboarding', 16, 'admin', 7, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Criar 3 variações de copy', 'Headlines, body, CTAs.', 'onboarding', 17, 'operator', 8, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Criar 3 variações de criativo', 'Imagem ou vídeo.', 'onboarding', 18, 'operator', 8, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Aprovar copies e criativos com cliente', 'Enviar pro portal.', 'onboarding', 19, 'admin', 10, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Subir campanhas no Meta Ads', 'Revisar antes de ativar.', 'onboarding', 20, 'operator', 12, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Configurar regras automáticas', 'Orçamento, pausa.', 'onboarding', 21, 'operator', 12, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Validar tracking e pixel', 'Teste de conversão.', 'onboarding', 22, 'operator', 12, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Enviar mensagem de boas-vindas ao grupo WhatsApp', 'Template padrão.', 'onboarding', 23, 'operator', 12, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Primeira revisão 24h após lançamento', 'Checar métricas.', 'onboarding', 24, 'operator', 13, 'client_created'),
('00000000-0000-0000-0000-000000000001', 'Enviar primeiro mini-relatório ao cliente', 'Via WhatsApp.', 'onboarding', 25, 'operator', 14, 'client_created')
ON CONFLICT DO NOTHING;

-- Templates de tarefas recorrentes semanais
INSERT INTO public.task_templates (organization_id, title, description, category, sort_order, default_assignee, default_due_days, auto_trigger) VALUES
('00000000-0000-0000-0000-000000000001', 'Revisar performance das campanhas', 'Checar gastos, CPL, CTR.', 'recurring_weekly', 1, 'operator', 1, 'week_start'),
('00000000-0000-0000-0000-000000000001', 'Otimizar anúncios', 'Pausar ruins, escalar bons.', 'recurring_weekly', 2, 'operator', 2, 'week_start'),
('00000000-0000-0000-0000-000000000001', 'Checar leads no CRM e qualidade do SDR', 'Revisar conversas.', 'recurring_weekly', 3, 'operator', 2, 'week_start'),
('00000000-0000-0000-0000-000000000001', 'Atualizar cliente no grupo WhatsApp', 'Resumo semanal.', 'recurring_weekly', 4, 'operator', 3, 'week_start')
ON CONFLICT DO NOTHING;

-- Templates de tarefas recorrentes mensais
INSERT INTO public.task_templates (organization_id, title, description, category, sort_order, default_assignee, default_due_days, auto_trigger) VALUES
('00000000-0000-0000-0000-000000000001', 'Gerar relatório mensal de performance', 'Compilar dados do mês.', 'recurring_monthly', 1, 'operator', 3, 'month_start'),
('00000000-0000-0000-0000-000000000001', 'Revisar e aprovar relatório', 'Admin valida antes do envio.', 'recurring_monthly', 2, 'admin', 4, 'month_start'),
('00000000-0000-0000-0000-000000000001', 'Publicar relatório no portal do cliente', 'Marca visible_to_client.', 'recurring_monthly', 3, 'admin', 5, 'month_start'),
('00000000-0000-0000-0000-000000000001', 'Enviar relatório via WhatsApp', 'No grupo.', 'recurring_monthly', 4, 'operator', 5, 'month_start'),
('00000000-0000-0000-0000-000000000001', 'Reunião de alinhamento com cliente', 'Agendar.', 'recurring_monthly', 5, 'admin', 10, 'month_start'),
('00000000-0000-0000-0000-000000000001', 'Renovar criativos', 'Novos copies e visuais.', 'recurring_monthly', 6, 'operator', 15, 'month_start'),
('00000000-0000-0000-0000-000000000001', 'Revisar e ajustar estratégia de público', 'Com base nos resultados.', 'recurring_monthly', 7, 'admin', 20, 'month_start')
ON CONFLICT DO NOTHING;

-- Billing config padrão
INSERT INTO public.billing_config (organization_id, company_legal_name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Adria Tecnologia e Marketing Digital', TRUE)
ON CONFLICT DO NOTHING;
