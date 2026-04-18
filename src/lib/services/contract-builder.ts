import type { ContractClause } from "@/lib/utils/contract-clauses";
import { GENERAL_CLAUSES, applyClauseVariables, buildRenewalClause } from "@/lib/utils/contract-clauses";

export function buildContractClauses(params: {
  late_fee_percentage: number;
  late_interest_monthly: number;
  contract_months: number;
  auto_renew: boolean;
  cancellation_fee_percentage: number;
  cancellation_notice_days: number;
  services: Array<{ clauses: ContractClause[] }>;
  custom: ContractClause[];
}): ContractClause[] {
  const renewalClause = buildRenewalClause(params.auto_renew, params.cancellation_notice_days);
  const generals = GENERAL_CLAUSES.map((c) =>
    applyClauseVariables(c, {
      late_fee: params.late_fee_percentage,
      late_interest: params.late_interest_monthly,
      contract_months: params.contract_months,
      notice_days: params.cancellation_notice_days,
      cancellation_fee: params.cancellation_fee_percentage,
      renewal_clause: renewalClause,
    })
  );

  const serviceClauses = params.services.flatMap((s) => s.clauses);

  return [...generals, ...serviceClauses, ...params.custom].sort((a, b) => a.order - b.order);
}
