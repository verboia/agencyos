export interface ContractClause {
  title: string;
  body: string;
  order: number;
}

export const GENERAL_CLAUSES: ContractClause[] = [
  {
    order: 1,
    title: "CLÁUSULA 1ª — DO OBJETO",
    body: "O presente contrato tem por objeto a prestação de serviços de marketing digital e gestão de tráfego pago pela CONTRATADA ao CONTRATANTE, conforme detalhamento dos serviços listados neste instrumento.",
  },
  {
    order: 2,
    title: "CLÁUSULA 2ª — DAS OBRIGAÇÕES DA CONTRATADA",
    body: "Cabe à CONTRATADA: (i) executar os serviços contratados com zelo, diligência e técnica; (ii) manter o CONTRATANTE informado sobre o andamento dos trabalhos; (iii) entregar relatórios periódicos de desempenho; (iv) respeitar a confidencialidade das informações do CONTRATANTE.",
  },
  {
    order: 3,
    title: "CLÁUSULA 3ª — DAS OBRIGAÇÕES DO CONTRATANTE",
    body: "Cabe ao CONTRATANTE: (i) efetuar os pagamentos nas datas acordadas; (ii) fornecer informações, acessos e materiais necessários à execução dos serviços; (iii) aprovar peças e criativos em até 48 horas; (iv) manter ativa a conta de anúncios e verba de mídia quando aplicável.",
  },
  {
    order: 4,
    title: "CLÁUSULA 4ª — DAS CONDIÇÕES DE PAGAMENTO",
    body: "O valor mensal contratado será pago até o dia de vencimento estabelecido, via PIX, boleto ou cartão de crédito, conforme indicado neste contrato. O atraso no pagamento acarretará multa de {{late_fee}}% e juros de {{late_interest}}% ao mês, calculados pro rata die.",
  },
  {
    order: 5,
    title: "CLÁUSULA 5ª — DO PRAZO E DA RENOVAÇÃO",
    body: "Este contrato vigorará pelo prazo de {{contract_months}} meses a contar da data de início. {{renewal_clause}}",
  },
  {
    order: 6,
    title: "CLÁUSULA 6ª — DA RESCISÃO",
    body: "Qualquer das partes poderá rescindir este contrato mediante aviso prévio de {{notice_days}} dias. A rescisão antecipada por parte do CONTRATANTE, sem justa causa, acarretará multa rescisória equivalente a {{cancellation_fee}}% do valor das mensalidades remanescentes.",
  },
  {
    order: 7,
    title: "CLÁUSULA 7ª — DA CONFIDENCIALIDADE",
    body: "As partes obrigam-se a manter em sigilo todas as informações comerciais, estratégicas e operacionais trocadas durante a vigência deste contrato, sob pena de responder por perdas e danos.",
  },
  {
    order: 8,
    title: "CLÁUSULA 8ª — DA LGPD",
    body: "As partes declaram observar a Lei Geral de Proteção de Dados (Lei 13.709/2018), tratando os dados pessoais apenas para as finalidades contratuais, adotando medidas técnicas e organizacionais adequadas à sua proteção.",
  },
  {
    order: 9,
    title: "CLÁUSULA 9ª — DAS DISPOSIÇÕES GERAIS",
    body: "Este contrato é celebrado em caráter irrevogável e irretratável, obrigando as partes, seus herdeiros e sucessores a qualquer título.",
  },
  {
    order: 10,
    title: "CLÁUSULA 10ª — DO FORO",
    body: "Fica eleito o foro da Comarca de Campo Grande/MS para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
  },
];

export function applyClauseVariables(
  clause: ContractClause,
  variables: Record<string, string | number>
): ContractClause {
  let body = clause.body;
  for (const [key, value] of Object.entries(variables)) {
    body = body.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  }
  return { ...clause, body };
}

export function buildRenewalClause(autoRenew: boolean, noticeDays: number): string {
  if (autoRenew) {
    return `Ao término da vigência, o contrato renovar-se-á automaticamente por iguais períodos, salvo manifestação em contrário de qualquer das partes, comunicada por escrito com antecedência mínima de ${noticeDays} dias.`;
  }
  return "Ao término da vigência, o contrato será encerrado automaticamente, salvo novo acordo entre as partes.";
}
