import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Contract, ContractService } from "@/types/database";
import {
  documentLabel,
  formatCurrencyBRL,
  formatDateLongPt,
  formatFullAddress,
  partyType,
  representationForm,
  valorPorExtenso,
} from "./pdf-helpers";

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 64,
    fontFamily: "Times-Roman",
    fontSize: 10.5,
    lineHeight: 1.55,
    color: "#111111",
  },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    textAlign: "justify",
    marginBottom: 6,
  },
  bold: {
    fontFamily: "Times-Bold",
  },
  italic: {
    fontStyle: "italic",
  },
  signatureLabel: {
    textAlign: "center",
    fontFamily: "Times-Bold",
    marginTop: 2,
  },
  signatureSub: {
    textAlign: "center",
    fontSize: 9.5,
  },
  signatureLine: {
    marginTop: 32,
    borderTopWidth: 0.5,
    borderTopColor: "#000000",
    width: "72%",
    marginHorizontal: "auto",
  },
  witnessRow: {
    marginTop: 20,
  },
  pageNumber: {
    position: "absolute",
    bottom: 26,
    right: 64,
    fontSize: 8.5,
    color: "#666666",
  },
});

const B = ({ children }: { children: React.ReactNode }) => <Text style={styles.bold}>{children}</Text>;

const P = ({ children }: { children: React.ReactNode }) => <Text style={styles.paragraph}>{children}</Text>;

const H = ({ children }: { children: React.ReactNode }) => <Text style={styles.sectionTitle}>{children}</Text>;

interface ContractDocumentProps {
  contract: Contract;
  services: ContractService[];
  clientCompanyName: string;
}

export function ContractDocument({ contract, services, clientCompanyName }: ContractDocumentProps) {
  const monthly = Number(contract.total_monthly_value ?? 0);
  const contratanteName = contract.legal_name || clientCompanyName || "CONTRATANTE";
  const docLabel = documentLabel(contract);
  const docNumber = contract.document_number || "—";
  const fullAddress = formatFullAddress(contract);
  const repName = (contract.representative_name || "—").toUpperCase();
  const nacionalidade = contract.representative_nationality || "brasileiro(a)";
  const estadoCivil = contract.representative_marital_status || "—";
  const profissao = contract.representative_profession || "—";
  const rg = contract.representative_rg?.trim() || null;
  const cpfRep = contract.representative_cpf || "—";
  const emailRep = contract.representative_email || contract.representative_email || "—";

  const monthlyFormatted = formatCurrencyBRL(monthly);
  const monthlyExtenso = valorPorExtenso(monthly);
  const proportionalExample = monthly ? formatCurrencyBRL((monthly / 30) * 10) : "R$ 0,00";

  const dateForSignature = contract.signed_at
    ? new Date(contract.signed_at)
    : contract.start_date
      ? new Date(contract.start_date)
      : new Date();
  const longDate = formatDateLongPt(dateForSignature);

  const customClauses = Array.isArray(contract.custom_clauses) ? contract.custom_clauses : [];
  const extraServiceClauses = services
    .flatMap((s) => (Array.isArray(s.clauses) ? s.clauses : []))
    .filter((c) => c && c.body);

  return (
    <Document
      title={`Contrato ${contract.contract_number}`}
      author="VERBO COMPANY"
      subject="Contrato de prestação de serviços"
    >
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TRÁFEGO PAGO, CRM E AGENTE DE INTELIGÊNCIA ARTIFICIAL
        </Text>

        <Text style={{ textAlign: "center", fontSize: 9.5, color: "#555", marginBottom: 14 }}>
          {contract.contract_number}
        </Text>

        <H>QUALIFICAÇÃO DAS PARTES</H>

        <P>
          <B>CONTRATADA: </B>
          M. R. SEREJO LTDA, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº
          49.140.175/0001-93, com nome fantasia VERBO COMPANY, com sede na Avenida Afonso Pena, nº 4.785,
          Sala 701, Bairro Santa Fé, CEP 79.031-010, Campo Grande – MS, neste ato representada, na forma
          de seu Contrato Social, por seu sócio-administrador MATHEUS RIBEIRO SEREJO, brasileiro, casado,
          empresário, portador do RG nº 2.068.319 SSP/MS e inscrito no CPF/MF sob o nº 043.885.511-63, com
          endereço eletrônico para comunicações formais contato@verbo.company, doravante simplesmente
          denominada <B>“CONTRATADA”</B>.
        </P>

        <P>
          <B>CONTRATANTE: </B>
          <B>{contratanteName}</B>, {partyType(contract)}, inscrita no {docLabel} sob o nº{" "}
          <B>{docNumber}</B>, com sede/endereço em {fullAddress}, neste ato representada, na forma de{" "}
          {representationForm(contract)}, por <B>{repName}</B>, {nacionalidade}, {estadoCivil}, {profissao},
          {rg ? ` portador do RG nº ${rg} e` : ""} inscrito no CPF/MF sob o nº {cpfRep}, com endereço
          eletrônico para comunicações formais {emailRep}, doravante simplesmente denominada{" "}
          <B>“CONTRATANTE”</B>.
        </P>

        <P>
          CONTRATADA e CONTRATANTE são, em conjunto, denominadas “Partes” e, individualmente, “Parte”, e têm
          entre si, justo e contratado, o presente Contrato de Prestação de Serviços (“Contrato”), que se
          regerá pelas cláusulas e condições a seguir, com fundamento nos artigos 421, 422 e 593 a 609 da
          Lei nº 10.406/2002 (Código Civil), na Lei nº 13.709/2018 (LGPD) e na Lei nº 12.965/2014 (Marco
          Civil da Internet).
        </P>

        <H>CLÁUSULA 1ª — DO OBJETO</H>
        <P>
          1.1. O presente Contrato tem por objeto a prestação, pela CONTRATADA em favor da CONTRATANTE, dos
          seguintes serviços digitais, de forma integrada e sob pacote mensal único (“Serviços”):
        </P>
        <P>
          (a) gestão de campanhas de tráfego pago em plataformas de mídia digital, notadamente Meta Ads
          (Facebook e Instagram) e, quando aplicável, Google Ads e congêneres;
        </P>
        <P>
          (b) disponibilização de acesso ao CRM proprietário da CONTRATADA, denominado “Adria” (ou
          “AdriaCRM”), em regime de licença de uso não exclusiva, não transferível e por prazo determinado
          coincidente com a vigência deste Contrato;
        </P>
        <P>
          (c) configuração, parametrização e operação de agente de inteligência artificial para atendimento
          e pré-qualificação comercial (“Agente SDR”), integrado ao CRM e ao WhatsApp da CONTRATANTE;
        </P>
        <P>
          (d) criação, em caráter bonificado, de até 2 (duas) landing pages por projeto, quando a CONTRATADA
          entender tecnicamente necessário ou quando expressamente solicitado pela CONTRATANTE dentro desse
          limite quantitativo.
        </P>
        <P>
          1.2. Os Serviços serão prestados de forma remota, com utilização de infraestrutura de tecnologia
          da CONTRATADA e de terceiros especializados (cloud, banco de dados, orquestração, hospedagem
          etc.), na forma detalhada na Cláusula 10 deste Contrato.
        </P>
        <P>
          1.3. Não estão incluídos no objeto deste Contrato, e serão objeto de orçamento próprio em
          apartado, caso venham a ser demandados: (i) criação de landing pages adicionais além das 2 (duas)
          bonificadas; (ii) produção de peças criativas (vídeos, imagens, roteiros) que exijam deslocamento,
          filmagem, atores, locução profissional ou contratação de terceiros; (iii) integrações sob medida
          com sistemas legados da CONTRATANTE; (iv) consultoria estratégica de marketing fora do escopo
          operacional aqui descrito; (v) quaisquer custos com plataformas de mídia (verba de anúncios), que
          são pagos diretamente pela CONTRATANTE às plataformas; e (vi) o consumo de tokens/créditos da LLM
          (Modelo de Linguagem de Grande Porte) escolhida pela CONTRATANTE, cujo regime é tratado na
          Cláusula 4.
        </P>

        <H>CLÁUSULA 2ª — DA NATUREZA DA OBRIGAÇÃO</H>
        <P>
          2.1. As Partes reconhecem expressamente que as obrigações da CONTRATADA previstas neste Contrato
          constituem <B>obrigação de meio</B>, e não de resultado. A CONTRATADA compromete-se a empregar
          seus melhores esforços técnicos, diligência profissional e boas práticas de mercado para a
          prestação dos Serviços, sem, contudo, garantir resultados específicos de vendas, leads, retorno
          sobre investimento (ROI), conversão, posicionamento, alcance ou qualquer outra métrica de
          desempenho, tendo em vista que tais resultados dependem de múltiplos fatores alheios à vontade e
          ao controle da CONTRATADA (mercado, concorrência, sazonalidade, qualidade do produto/serviço da
          CONTRATANTE, políticas das plataformas, comportamento dos consumidores etc.).
        </P>
        <P>
          2.2. Não há, entre CONTRATADA e CONTRATANTE, qualquer vínculo empregatício, societário,
          associativo, de representação, franquia, consórcio ou responsabilidade solidária, respondendo cada
          Parte, de forma exclusiva e isolada, pelos seus respectivos encargos trabalhistas,
          previdenciários, fiscais e comerciais.
        </P>

        <H>CLÁUSULA 3ª — DA IMPLANTAÇÃO E DO INÍCIO DA PRESTAÇÃO DOS SERVIÇOS</H>
        <P>
          3.1. As Partes convencionam que o <B>início efetivo da prestação dos Serviços</B> fica
          condicionado à confirmação, pela CONTRATADA, do adimplemento integral da primeira fatura mensal
          emitida via plataforma Asaas, nos termos da Cláusula 5. Somente após a confirmação do pagamento é
          que a CONTRATADA iniciará as atividades de implantação.
        </P>
        <P>
          3.2. A <B>etapa de implantação (onboarding)</B> compreende, obrigatoriamente, as seguintes
          atividades preliminares:
        </P>
        <P>
          (a) solicitação, acompanhamento e submissão do processo de aprovação/verificação da Business
          Manager (BM) da CONTRATANTE junto à Meta Platforms, Inc., bem como a configuração e liberação das
          permissões de acesso necessárias à gestão de anúncios e ao uso do WhatsApp Business API;
        </P>
        <P>
          (b) criação, parametrização e publicação do Agente SDR de inteligência artificial, incluindo
          treinamento inicial com base no material e nas informações fornecidas pela CONTRATANTE;
        </P>
        <P>
          (c) criação, caso entendida tecnicamente necessária pela CONTRATADA ou expressamente solicitada
          pela CONTRATANTE dentro do limite contratual, de até 2 (duas) landing pages em caráter bonificado.
        </P>
        <P>
          3.3. A CONTRATANTE reconhece e concorda que o cronograma da etapa de implantação depende de
          fatores externos, notadamente dos prazos internos da Meta Platforms, Inc. para análise e aprovação
          da verificação de BM e das permissões associadas, os quais podem variar de poucos dias a várias
          semanas e estão fora do controle da CONTRATADA. A demora ou recusa de aprovação pela Meta, por
          qualquer motivo, não configurará inadimplemento contratual por parte da CONTRATADA, nem dará
          direito a suspensão, restituição ou compensação de valores, aplicando-se o disposto na Cláusula
          10.
        </P>
        <P>
          3.4. Para viabilizar a implantação, a CONTRATANTE compromete-se a fornecer, em até 5 (cinco) dias
          úteis contados da confirmação do pagamento, todas as informações, credenciais, acessos, documentos
          e materiais necessários, incluindo, sem limitação: (i) acesso administrativo à BM da Meta; (ii)
          documentos societários/pessoais eventualmente exigidos pela Meta para verificação; (iii) número
          de telefone dedicado à integração com o WhatsApp Business API; (iv){" "}
          <B>token/chave de API da LLM</B> escolhida, informada diretamente no CRM Adria na área específica
          de configuração do Agente SDR; (v) informações sobre produto/serviço, público-alvo, diferenciais,
          objeções comuns, políticas comerciais e demais dados necessários ao treinamento do Agente SDR; e
          (vi) materiais gráficos básicos (logomarca, cores, fotos) para eventual produção de landing pages
          e criativos.
        </P>
        <P>
          3.5. O atraso ou a não disponibilização dos insumos previstos na Cláusula 3.4 pela CONTRATANTE
          importará em suspensão automática dos prazos da CONTRATADA, sem caracterizar mora desta,
          permanecendo, entretanto, íntegra a obrigação de pagamento da fatura mensal pela CONTRATANTE, nos
          termos da Cláusula 5.3.
        </P>

        <H>CLÁUSULA 4ª — DO TOKEN DA LLM E DA RESPONSABILIDADE PELO MODELO DE LINGUAGEM</H>
        <P>
          4.1. A CONTRATANTE reconhece e aceita que o Agente SDR opera mediante integração com um Modelo de
          Linguagem de Grande Porte (LLM) de sua livre escolha (ex.: OpenAI, Anthropic, Google, entre
          outros), cabendo exclusivamente à <B>CONTRATANTE</B>: (i) contratar e manter ativa sua conta junto
          ao provedor de LLM escolhido; (ii) custear integralmente o consumo de tokens, créditos,
          assinaturas e quaisquer outras tarifas cobradas pelo provedor da LLM; (iii) fornecer e manter
          válido o token/chave de API no CRM Adria, na área específica de configuração do Agente SDR; e (iv)
          aceitar os termos de uso, políticas de privacidade e políticas de conteúdo do provedor da LLM
          escolhida.
        </P>
        <P>
          4.2. A CONTRATADA não se responsabiliza, em nenhuma hipótese, por: (a) indisponibilidade,
          latência, falhas, alterações de preço, alterações de políticas, descontinuação de modelos ou
          suspensão de contas perante o provedor da LLM; (b) custos de consumo de tokens, inclusive picos de
          consumo decorrentes de volume inesperado de interações; (c) respostas produzidas pelo modelo de IA
          que, apesar das melhores práticas de engenharia de prompt e guardrails aplicadas pela CONTRATADA,
          venham a conter imprecisões, alucinações, informações desatualizadas ou conteúdo inadequado,
          característicos e inerentes à tecnologia de IA generativa; e (d) bloqueio ou suspensão da conta da
          CONTRATANTE pelo provedor da LLM por violação de termos de uso, cujo conteúdo é de conhecimento e
          responsabilidade exclusiva da CONTRATANTE.
        </P>
        <P>
          4.3. Em caso de esgotamento de créditos, expiração, revogação ou invalidez do token da LLM, o
          Agente SDR deixará de operar até que a CONTRATANTE forneça novo token válido ou recarregue seus
          créditos, sem que isso configure interrupção do Serviço por culpa da CONTRATADA.
        </P>

        <H>CLÁUSULA 5ª — DO PREÇO, FORMA DE PAGAMENTO E REAJUSTE</H>
        <P>
          5.1. Pela prestação dos Serviços descritos na Cláusula 1, a CONTRATANTE pagará à CONTRATADA o
          valor mensal, fixo e único, de <B>{monthlyFormatted}</B> ({monthlyExtenso}) (“Mensalidade”).
        </P>
        <P>
          5.2. A Mensalidade será cobrada exclusivamente por meio da plataforma <B>Asaas</B> (ou outra que
          venha a substituí-la, mediante simples comunicação à CONTRATANTE), mediante boleto bancário, PIX,
          cartão de crédito ou outro meio de pagamento disponibilizado pela referida plataforma, a critério
          da CONTRATANTE.
        </P>
        <P>
          5.3. O <B>primeiro pagamento</B> ocorrerá na data de assinatura deste Contrato ou, no máximo, em
          até 5 (cinco) dias da emissão da respectiva cobrança, e{" "}
          <B>antecede, obrigatoriamente, o início da prestação dos Serviços</B>, nos termos da Cláusula 3.1.
          As demais Mensalidades vencerão no mesmo dia do mês subsequente ao primeiro pagamento (“Dia de
          Vencimento”).
        </P>
        <P>
          5.4. A Mensalidade não inclui e é expressamente dissociada: (i) dos valores da verba de tráfego
          (budget) a ser pago diretamente pela CONTRATANTE às plataformas de anúncios (Meta, Google etc.);
          (ii) dos custos de tokens/créditos da LLM, nos termos da Cláusula 4; e (iii) de eventuais serviços
          extras que a CONTRATANTE venha a contratar fora do escopo da Cláusula 1.
        </P>
        <P>
          5.5. Decorrido o prazo de 12 (doze) meses de vigência contínua, a Mensalidade poderá ser reajustada
          com base na variação positiva acumulada do IPCA/IBGE no período ou, na sua ausência ou extinção,
          por índice oficial que o venha a substituir, mediante simples comunicação prévia da CONTRATADA à
          CONTRATANTE, com antecedência mínima de 30 (trinta) dias.
        </P>

        <H>CLÁUSULA 6ª — DA MORA E DOS ENCARGOS POR ATRASO</H>
        <P>
          6.1. O atraso no pagamento de qualquer Mensalidade sujeitará a CONTRATANTE, independentemente de
          interpelação (art. 397 do Código Civil), aos seguintes encargos, cumulativamente: (a){" "}
          <B>multa moratória de {contract.late_fee_percentage}% </B>sobre o valor em atraso; (b){" "}
          <B>juros moratórios de {contract.late_interest_monthly}% ao mês</B>, pro rata die; e (c){" "}
          <B>correção monetária</B> pelo IPCA/IBGE ou índice que o substitua, nos termos do art. 389 do
          Código Civil.
        </P>
        <P>
          6.2. Sem prejuízo dos encargos acima, o atraso superior a 10 (dez) dias corridos autorizará a
          CONTRATADA, a seu exclusivo critério, a: (i) suspender imediatamente a prestação dos Serviços,
          incluindo, mas não se limitando à pausa de campanhas ativas, bloqueio de acesso ao CRM Adria e
          desativação do Agente SDR, sem que tal suspensão configure descumprimento contratual por parte da
          CONTRATADA; e (ii) encaminhar o débito para cobrança extrajudicial ou judicial, bem como para
          protesto e inscrição em órgãos de proteção ao crédito, observada a legislação aplicável.
        </P>
        <P>
          6.3. Eventuais despesas de cobrança, inclusive honorários advocatícios no percentual mínimo de 20%
          (vinte por cento) sobre o valor em aberto, serão de responsabilidade da CONTRATANTE.
        </P>

        <H>CLÁUSULA 7ª — DA VIGÊNCIA</H>
        <P>
          7.1. O presente Contrato entra em vigor na data de sua assinatura e vigorará por prazo
          indeterminado, observada a possibilidade de resilição unilateral por qualquer das Partes, na forma
          da Cláusula 8.
        </P>

        <H>CLÁUSULA 8ª — DO CANCELAMENTO (RESILIÇÃO UNILATERAL)</H>
        <P>
          8.1. Qualquer das Partes poderá, a qualquer tempo e sem justa causa, resilir unilateralmente o
          presente Contrato, na forma do art. 473 do Código Civil, mediante{" "}
          <B>aviso prévio mínimo de {contract.cancellation_notice_days} (trinta) dias corridos</B>, contados
          a partir da comunicação formal nos termos da Cláusula 8.2.
        </P>
        <P>
          8.2. As Partes, desde já, elegem, de comum acordo e para todos os fins legais (art. 107 do Código
          Civil), como <B>meio idôneo e suficiente de comunicação da intenção de cancelamento</B>, a
          manifestação expressa da CONTRATANTE (ou seu representante) no{" "}
          <B>grupo de WhatsApp criado especificamente para o projeto</B> (“Grupo do Projeto”), devendo a
          mensagem conter, de forma inequívoca, (i) a palavra “cancelamento” (ou equivalente claro como
          “rescisão”, “encerrar contrato”) e (ii) a data a partir da qual a CONTRATANTE manifesta a intenção
          de encerrar a prestação dos Serviços. A mesma regra se aplica, simetricamente, à comunicação feita
          pela CONTRATADA à CONTRATANTE.
        </P>
        <P>
          8.3. Para efeitos probatórios, servirá como prova da comunicação de cancelamento o print e/ou
          extrato da conversa do Grupo do Projeto, acompanhado, se solicitado, de declaração de autenticidade
          da CONTRATADA. As Partes renunciam expressamente à exigência de formalização por instrumento
          particular escrito, e-mail, notificação extrajudicial ou qualquer outro meio, sem prejuízo da
          faculdade de utilizá-los se assim desejarem.
        </P>
        <P>
          8.4. <B>Não haverá multa contratual por cancelamento</B>. Durante o aviso prévio de{" "}
          {contract.cancellation_notice_days} (trinta) dias, a CONTRATADA continuará prestando os Serviços em
          regime regular, e a CONTRATANTE permanecerá obrigada ao pagamento integral e pontual de qualquer
          Mensalidade vincenda nesse período, aplicando-se a elas, em caso de atraso, os encargos previstos
          na Cláusula 6.
        </P>
        <P>
          8.5. <B>Pagamento proporcional (pro rata die)</B>. Encerrado o aviso prévio em data distinta do
          ciclo mensal já pago, a CONTRATANTE ficará obrigada ao pagamento do valor proporcional
          correspondente aos dias efetivamente prestados no último ciclo, calculado pela fórmula: Valor
          Proporcional = (Mensalidade ÷ 30) × (número de dias corridos entre o início do ciclo vigente e a
          data final do aviso prévio).
        </P>
        <P>
          8.5.1. Para fins de clareza, se a CONTRATANTE iniciou o ciclo mensal no dia 17, pagou a
          Mensalidade, e quer cancelar no dia 27 do mesmo mês, o aviso prévio de 30 dias se encerra no dia
          26 do mês seguinte. Nesse cenário, (i) o período de 17 a 16 do mês seguinte já está coberto pela
          Mensalidade paga; e (ii) a CONTRATANTE ficará obrigada a pagar, ao final do aviso prévio, o valor
          proporcional correspondente aos dias de 17 a 26 do mês seguinte (10 dias), ou seja, aproximadamente{" "}
          <B>{proportionalExample}</B>, calculados como ({monthlyFormatted} ÷ 30) × 10.
        </P>
        <P>
          8.6. A cobrança do valor proporcional será emitida pela CONTRATADA via plataforma Asaas, com
          vencimento em até 5 (cinco) dias úteis após o término do aviso prévio, sujeitando-se, em caso de
          atraso, aos encargos da Cláusula 6.
        </P>
        <P>
          8.7. <B>Resolução por justa causa.</B> Independentemente do disposto acima, qualquer das Partes
          poderá resolver este Contrato de pleno direito, mediante comunicação pelo Grupo do Projeto ou por
          e-mail, sem aviso prévio e sem ônus adicional, nos casos de: (i) inadimplemento de obrigação
          essencial pela outra Parte não sanado em 10 (dez) dias corridos da respectiva notificação; (ii)
          decretação de falência, recuperação judicial ou extrajudicial, insolvência civil ou dissolução da
          outra Parte; (iii) prática, pela outra Parte, de atos que violem a legislação aplicável,
          notadamente a LGPD e o Marco Civil da Internet, ou que importem em descumprimento reiterado dos
          termos de uso das plataformas terceiras utilizadas na prestação dos Serviços (Meta, Google,
          provedor da LLM etc.).
        </P>

        <H>CLÁUSULA 9ª — DA LIMITAÇÃO DE RESPONSABILIDADE</H>
        <P>
          9.1. Ressalvadas as hipóteses de dolo ou culpa grave devidamente comprovados, a responsabilidade
          civil agregada e total da CONTRATADA, por qualquer causa ou fundamento (contratual, extracontratual,
          direta, indireta, reflexa ou solidária), fica{" "}
          <B>limitada ao valor correspondente à última Mensalidade efetivamente paga</B> pela CONTRATANTE no
          ciclo em que ocorrer o evento gerador do dano, excluídos, em qualquer caso, lucros cessantes,
          danos indiretos, perda de chance, dano reputacional presumido, receita cessante, despesas com
          verba de tráfego e custos com tokens/LLM.
        </P>
        <P>
          9.2. A limitação prevista na Cláusula 9.1 é reconhecida pelas Partes como justa, proporcional e
          necessária à equação econômica do Contrato, considerando que a Mensalidade é fixa e não reflete,
          tampouco poderia refletir, o valor de eventuais prejuízos que a CONTRATANTE pudesse vir a sofrer
          em decorrência de variáveis mercadológicas, comportamentais ou sistêmicas não controláveis pela
          CONTRATADA.
        </P>

        <H>CLÁUSULA 10 — DA INFRAESTRUTURA DE TERCEIROS E DAS SITUAÇÕES ALHEIAS À VONTADE DA CONTRATADA</H>
        <P>
          10.1. A CONTRATANTE reconhece, expressamente e de forma informada, que a prestação dos Serviços
          depende, estrutural e inevitavelmente, de uma cadeia de fornecedores e plataformas de tecnologia
          operadas por <B>terceiros independentes</B>, incluindo, sem limitação: (a) infraestrutura de banco
          de dados e autenticação (ex.: Supabase); (b) infraestrutura de hospedagem, borda e entrega de
          aplicação (ex.: Vercel, Cloudflare, AWS); (c) plataformas de orquestração e automação (ex.: n8n);
          (d) plataformas de mídia e mensageria (Meta/WhatsApp Business API, Google, entre outras); (e)
          provedores de LLM e serviços de IA escolhidos pela CONTRATANTE (Cláusula 4); (f) provedor de
          pagamento (Asaas); e (g) provedores de e-mail, telefonia, SMS e correlatos (“Terceiros”).
        </P>
        <P>
          10.2. A CONTRATADA não detém controle técnico, operacional ou jurídico sobre os Terceiros e,
          consequentemente,{" "}
          <B>
            não responde por indisponibilidades, latências, falhas técnicas, interrupções programadas ou não
            programadas, alterações unilaterais de políticas, preços, funcionalidades, limites de uso (rate
            limits), deplataformização, bloqueios de contas, reprovação de verificação de BM, reclassificação
            de templates, perda ou atraso de entregabilidade de mensagens, ou qualquer outro evento
            originado, causado ou provocado pelos Terceiros
          </B>
          , desde que a CONTRATADA tenha observado as melhores práticas técnicas na integração e operação
          com tais Terceiros.
        </P>
        <P>
          10.3. Para os fins do art. 393 do Código Civil e em consonância com o Enunciado 443 do Conselho
          da Justiça Federal, as Partes convencionam, de forma expressa, que{" "}
          <B>configuram fortuito externo excludente da responsabilidade da CONTRATADA</B>, entre outros: (i)
          falhas, apagões, incidentes de segurança e indisponibilidades sistêmicas em provedores de nuvem
          ou infraestrutura utilizados pela CONTRATADA ou por seus fornecedores; (ii) bloqueio, suspensão,
          banimento ou rebaixamento de contas, páginas, perfis, números, BMs, WABAs, anúncios ou campanhas
          da CONTRATANTE pelas plataformas de Terceiros, inclusive Meta, Google e provedores de LLM, quando
          não decorrentes de conduta dolosa ou com culpa grave da CONTRATADA; (iii) mudanças unilaterais de
          políticas, APIs, termos de uso ou algoritmos dos Terceiros que impactem a continuidade ou o
          desempenho dos Serviços; (iv) ataques cibernéticos de qualquer natureza (DDoS, ransomware,
          engenharia social) direcionados à CONTRATADA, à CONTRATANTE ou aos Terceiros; e (v) eventos de
          força maior clássicos (pandemias, calamidades públicas, atos governamentais, interrupções
          generalizadas de telecomunicações ou energia elétrica, greves gerais etc.).
        </P>
        <P>
          10.4. Nas hipóteses da Cláusula 10.3, a CONTRATADA envidará esforços razoáveis para, conforme o
          caso, (i) mitigar os efeitos do evento; (ii) acionar os Terceiros cabíveis; e (iii) restabelecer
          os Serviços no menor prazo tecnicamente viável, sem que isso lhe imponha obrigação de pagamento
          de indenização, devolução, abatimento ou compensação de Mensalidade, ressalvada a hipótese de
          inexecução contínua superior a 15 (quinze) dias corridos diretamente imputável à CONTRATADA, caso
          em que se aplicará, a título de única e exclusiva compensação, o desconto proporcional pro rata
          die na Mensalidade do ciclo afetado.
        </P>
        <P>
          10.5. A CONTRATANTE declara estar ciente de que políticas das plataformas de Terceiros podem, a
          qualquer tempo e sem anuência da CONTRATADA, alterar funcionalidades, categorias de anúncio,
          critérios de aprovação, modelos de cobrança e regras de conteúdo, exigindo, eventualmente,
          adaptações do escopo operacional dos Serviços, as quais serão implementadas pela CONTRATADA
          dentro das melhores práticas, sem que isso caracterize alteração contratual onerosa.
        </P>

        <H>CLÁUSULA 11 — DAS OBRIGAÇÕES DA CONTRATADA</H>
        <P>
          11.1. Sem prejuízo das demais obrigações previstas neste Contrato, são obrigações da CONTRATADA:
        </P>
        <P>
          (a) prestar os Serviços com diligência, técnica e ética profissional, observando as boas práticas
          de mercado;
        </P>
        <P>
          (b) manter canal aberto de comunicação com a CONTRATANTE, preferencialmente pelo Grupo do
          Projeto, para acompanhamento, dúvidas e repasse de informações relevantes;
        </P>
        <P>
          (c) disponibilizar, dentro das funcionalidades do CRM Adria, relatórios e dashboards que permitam
          à CONTRATANTE acompanhar, em tempo útil, indicadores operacionais dos Serviços;
        </P>
        <P>
          (d) observar as obrigações que lhe couberem na qualidade de Operadora de dados pessoais, nos
          termos da Cláusula 14 e da legislação aplicável;
        </P>
        <P>(e) guardar sigilo sobre as informações confidenciais da CONTRATANTE, nos termos da Cláusula 13;</P>
        <P>
          (f) comunicar à CONTRATANTE, com antecedência razoável e por meio do Grupo do Projeto, eventuais
          alterações substanciais na arquitetura técnica que possam impactar a prestação dos Serviços.
        </P>

        <H>CLÁUSULA 12 — DAS OBRIGAÇÕES DA CONTRATANTE</H>
        <P>
          12.1. Sem prejuízo das demais obrigações previstas neste Contrato, são obrigações da CONTRATANTE:
        </P>
        <P>(a) pagar, de forma integral e pontual, as Mensalidades, nos termos das Cláusulas 5 e 6;</P>
        <P>
          (b) custear, direta e integralmente, a verba de tráfego junto às plataformas de anúncios, bem
          como os tokens/créditos da LLM, nos termos das Cláusulas 4 e 5.4;
        </P>
        <P>
          (c) fornecer, manter atualizados e garantir a veracidade das informações, credenciais e materiais
          necessários à prestação dos Serviços (Cláusula 3.4);
        </P>
        <P>
          (d) cumprir, em relação ao seu negócio, às plataformas de Terceiros e ao público final, toda a
          legislação aplicável, notadamente a LGPD, o Código de Defesa do Consumidor, o Marco Civil da
          Internet, os termos de uso da Meta, do Google, do WhatsApp Business, do provedor de LLM e do
          Asaas;
        </P>
        <P>
          (e) não utilizar os Serviços, o CRM Adria ou o Agente SDR para finalidades ilícitas, fraudulentas,
          discriminatórias, abusivas ou em violação a direitos de terceiros;
        </P>
        <P>
          (f) responsabilizar-se, de forma exclusiva, pelo conteúdo das campanhas de tráfego, dos anúncios,
          das landing pages e das mensagens enviadas ao público final por meio do Agente SDR, inclusive
          quanto à veracidade, legalidade, propriedade intelectual e adequação regulatória do produto ou
          serviço anunciado;
        </P>
        <P>
          (g) garantir base de contatos/leads com bases legais adequadas para o envio de mensagens, nos
          termos da LGPD, especialmente quando se tratar de dados pessoais de consumidores.
        </P>

        <H>CLÁUSULA 13 — DA CONFIDENCIALIDADE</H>
        <P>
          13.1. As Partes obrigam-se, reciprocamente, a manter em absoluto sigilo todas as informações,
          dados, materiais, estratégias, know-how, métricas, planos de negócio, fórmulas, prompts, roteiros
          e demais informações a que tiverem acesso em razão deste Contrato (“Informações Confidenciais”),
          não as utilizando para qualquer finalidade distinta da execução do Contrato.
        </P>
        <P>
          13.2. A obrigação de confidencialidade permanecerá em vigor pelo prazo de 5 (cinco) anos contados
          do término do Contrato, por qualquer razão, excetuadas as informações que (i) sejam ou se tornem
          públicas sem violação deste Contrato; (ii) já sejam de conhecimento comprovado da Parte receptora
          antes da celebração; (iii) devam ser reveladas por força de ordem judicial ou determinação de
          autoridade competente, hipótese em que a Parte receptora comunicará, sempre que legalmente
          possível, a outra Parte antes da revelação.
        </P>
        <P>
          13.3. A CONTRATADA poderá mencionar a CONTRATANTE como cliente em seu portfólio, cases e materiais
          institucionais (nome, logo e resultados em caráter geral), salvo manifestação expressa em
          contrário pela CONTRATANTE por escrito.
        </P>

        <H>CLÁUSULA 14 — DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)</H>
        <P>
          14.1. Para os fins do art. 5º, VI, VII e XIV da Lei nº 13.709/2018 (“LGPD”), as Partes reconhecem
          que, no âmbito da execução deste Contrato: a <B>CONTRATANTE atua como Controladora</B> dos dados
          pessoais de leads, clientes, prospects e demais titulares que venham a ser tratados em suas
          campanhas, base de contatos e interações com o Agente SDR; e a{" "}
          <B>CONTRATADA atua como Operadora</B>, realizando o tratamento de tais dados exclusivamente em
          nome, por conta e sob as instruções documentadas da CONTRATANTE, por meio do CRM Adria e dos
          fluxos integrados.
        </P>
        <P>
          14.2. A CONTRATADA, na condição de Operadora, compromete-se a: (i) tratar os dados pessoais
          apenas para as finalidades contratadas; (ii) adotar medidas técnicas e administrativas razoáveis
          e aptas a proteger os dados pessoais, conforme o art. 46 da LGPD; (iii) manter registro das
          operações de tratamento que executa em favor da CONTRATANTE; (iv) auxiliar a CONTRATANTE, dentro
          de suas possibilidades técnicas, no atendimento às requisições dos titulares (art. 18 da LGPD);
          (v) comunicar à CONTRATANTE, em prazo razoável, eventual incidente de segurança que envolva os
          dados pessoais sob tratamento; e (vi) subcontratar suboperadores (Terceiros, Cláusula 10),
          considerando-se a presente cláusula como autorização prévia e geral da CONTRATANTE para tal
          subcontratação, observadas, sempre, as exigências da LGPD.
        </P>
        <P>
          14.3. A CONTRATANTE, na condição de Controladora, é responsável por: (i) possuir base legal
          válida (art. 7º da LGPD) para o tratamento dos dados pessoais incluídos em suas bases e
          campanhas; (ii) fornecer informações claras aos titulares em sua política de privacidade; (iii)
          atender, em primeira camada, às requisições dos titulares; e (iv) responder perante a ANPD e
          titulares pelo conteúdo e pela licitude do tratamento, sem prejuízo da responsabilidade solidária
          prevista em lei.
        </P>
        <P>
          14.4. Após o término deste Contrato, a CONTRATADA, salvo obrigação legal em contrário, excluirá
          ou devolverá à CONTRATANTE os dados pessoais tratados em razão deste Contrato, no prazo de até 90
          (noventa) dias, podendo, entretanto, reter cópias em backup, logs e registros operacionais pelo
          prazo necessário ao cumprimento de obrigações legais e ao exercício regular de direitos em
          processo judicial, administrativo ou arbitral.
        </P>

        <H>CLÁUSULA 15 — DA PROPRIEDADE INTELECTUAL</H>
        <P>
          15.1. O{" "}
          <B>
            CRM Adria (AdriaCRM), o código-fonte, a arquitetura técnica, os fluxos de automação, os prompts,
            os guardrails, os templates, os dashboards e toda a tecnologia subjacente
          </B>{" "}
          são e permanecerão de titularidade exclusiva da CONTRATADA, sendo concedida à CONTRATANTE, durante
          a vigência deste Contrato, apenas uma licença de uso não exclusiva, não transferível, revogável e
          limitada ao escopo dos Serviços. Nenhuma disposição deste Contrato implica cessão, transferência
          ou licenciamento permanente da tecnologia da CONTRATADA.
        </P>
        <P>
          15.2. Os dados inseridos pela CONTRATANTE no CRM Adria, bem como o conteúdo das campanhas,
          criativos fornecidos pela CONTRATANTE, nome e marca da CONTRATANTE, permanecem de titularidade
          da CONTRATANTE.
        </P>
        <P>
          15.3. Landing pages, criativos e peças produzidas pela CONTRATADA especificamente para a
          CONTRATANTE serão consideradas licenciadas à CONTRATANTE para uso durante a vigência contratual,
          podendo ser convertidas em cessão definitiva mediante negociação específica ao final do Contrato.
        </P>

        <H>CLÁUSULA 16 — DAS COMUNICAÇÕES</H>
        <P>
          16.1. Todas as comunicações relativas à execução deste Contrato — incluindo dúvidas, solicitações,
          alinhamentos, aprovações e, conforme Cláusula 8, a própria manifestação de cancelamento — serão
          consideradas válidas e eficazes quando realizadas no{" "}
          <B>Grupo do Projeto no WhatsApp</B>, previamente criado pela CONTRATADA com os representantes
          indicados pela CONTRATANTE, dispensada qualquer outra formalidade.
        </P>
        <P>
          16.2. Comunicações formais de caráter financeiro (faturas, boletos, recibos) serão realizadas
          pela plataforma Asaas. Comunicações de caráter jurídico poderão, alternativamente, ser realizadas
          por e-mail, cujos endereços oficiais serão informados pelas Partes quando solicitadas.
        </P>

        <H>CLÁUSULA 17 — DAS DISPOSIÇÕES GERAIS</H>
        <P>
          17.1. Este Contrato constitui o inteiro acordo entre as Partes sobre o seu objeto, prevalecendo
          sobre quaisquer entendimentos anteriores, verbais ou escritos. Alterações dependerão de termo
          aditivo escrito, ressalvadas comunicações operacionais pelo Grupo do Projeto que não importem em
          alteração de cláusulas econômicas ou essenciais.
        </P>
        <P>
          17.2. A tolerância de qualquer das Partes quanto ao descumprimento de obrigação pela outra não
          constituirá novação, renúncia ou precedente, podendo ser exigida a qualquer tempo.
        </P>
        <P>
          17.3. A eventual invalidade ou ineficácia de qualquer cláusula deste Contrato não afetará as
          demais, que permanecerão em pleno vigor.
        </P>
        <P>
          17.4. Este Contrato é celebrado em caráter irrevogável e irretratável, obrigando as Partes, seus
          herdeiros, sucessores e cessionários a qualquer título.
        </P>
        <P>
          17.5. A cessão da posição contratual pela CONTRATANTE depende de prévia e expressa anuência da
          CONTRATADA. A CONTRATADA poderá ceder este Contrato a empresa do mesmo grupo econômico, mediante
          simples comunicação.
        </P>
        <P>
          17.6. Para fins de execução de título extrajudicial, as Partes reconhecem expressamente a higidez
          deste Contrato, nos termos do art. 784, III, do Código de Processo Civil.
        </P>

        <H>CLÁUSULA 18 — DO FORO</H>
        <P>
          18.1. As Partes elegem o foro da Comarca de Campo Grande, Estado de Mato Grosso do Sul, como
          único competente para dirimir quaisquer controvérsias oriundas deste Contrato, com renúncia a
          qualquer outro, por mais privilegiado que seja.
        </P>

        {extraServiceClauses.length > 0 && (
          <>
            <H>CLÁUSULAS ESPECÍFICAS DOS SERVIÇOS CONTRATADOS</H>
            {extraServiceClauses.map((clause, idx) => (
              <View key={`svc-${idx}`} wrap={false}>
                {clause.title && (
                  <Text style={[styles.paragraph, styles.bold]}>{clause.title}</Text>
                )}
                <P>{clause.body}</P>
              </View>
            ))}
          </>
        )}

        {customClauses.length > 0 && (
          <>
            <H>CLÁUSULAS ADICIONAIS</H>
            {customClauses.map((clause, idx) => (
              <View key={`custom-${idx}`} wrap={false}>
                {clause.title && (
                  <Text style={[styles.paragraph, styles.bold]}>{clause.title}</Text>
                )}
                <P>{clause.body}</P>
              </View>
            ))}
          </>
        )}

        <P>
          E, por estarem assim justas e contratadas, as Partes assinam o presente instrumento de forma
          eletrônica, nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001, em ambiente que
          lhes garanta a autoria e integridade, produzindo todos os efeitos legais.
        </P>

        <Text style={{ marginTop: 12, textAlign: "center" }}>Campo Grande – MS, {longDate}.</Text>

        <View wrap={false} style={{ marginTop: 28 }}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>CONTRATADA</Text>
          <Text style={styles.signatureSub}>
            M. R. SEREJO LTDA (VERBO COMPANY) — CNPJ 49.140.175/0001-93
          </Text>
          <Text style={styles.signatureSub}>Matheus Ribeiro Serejo — CPF 043.885.511-63</Text>
        </View>

        <View wrap={false} style={{ marginTop: 28 }}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>CONTRATANTE</Text>
          <Text style={styles.signatureSub}>
            {contratanteName} — {docLabel} {docNumber}
          </Text>
          <Text style={styles.signatureSub}>
            {contract.representative_name || "Representante Legal"}
          </Text>
        </View>

        <View wrap={false} style={{ marginTop: 36 }}>
          <Text style={styles.bold}>TESTEMUNHAS</Text>
          <Text style={styles.witnessRow}>
            1) ________________________________________ Nome: _______________________ CPF: ________________
          </Text>
          <Text style={styles.witnessRow}>
            2) ________________________________________ Nome: _______________________ CPF: ________________
          </Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
