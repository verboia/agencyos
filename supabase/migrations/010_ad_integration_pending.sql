-- =============================================================
-- 010_ad_integration_pending.sql
-- Adiciona status 'pending_selection' ao ENUM ad_integration_status.
-- Usado quando OAuth retorna várias contas e o cliente ainda
-- precisa escolher quais efetivamente vincular ao AgencyOS.
-- =============================================================

ALTER TYPE ad_integration_status ADD VALUE IF NOT EXISTS 'pending_selection';
