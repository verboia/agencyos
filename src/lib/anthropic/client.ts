interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export async function generateAnalysis(prompt: string, system?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return mockAnalysis(prompt);
  }
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: system ?? buildSystemPrompt(),
        messages: [{ role: "user", content: prompt }] satisfies AnthropicMessage[],
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Anthropic ${response.status}`);
    }
    const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
    return data.content.find((c) => c.type === "text")?.text ?? "";
  } catch (err) {
    console.error("Anthropic error", err);
    return mockAnalysis(prompt);
  }
}

function buildSystemPrompt(): string {
  return [
    "Você é um analista de marketing digital sênior da agência Adria.",
    "Escreva análises curtas, claras e em português brasileiro.",
    "Use linguagem direta, prática, sem jargão excessivo.",
    "Estrutura: 1 parágrafo de resumo + 3 a 5 bullets de pontos de atenção + 2 a 3 sugestões.",
  ].join(" ");
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function mockAnalysis(prompt: string): string {
  return [
    "**Resumo (mock)**",
    "",
    "Os indicadores apresentam um quadro estável, com oportunidades de otimização claras. (Análise gerada em modo mock — configure a ANTHROPIC_API_KEY para insights reais.)",
    "",
    "**Pontos de atenção**",
    "- CPL próximo do benchmark do segmento, mas pode melhorar com novos criativos",
    "- CTR aceitável; testar variações de copy mais agressivas",
    "- Volume de leads dentro do esperado para o investimento",
    "",
    "**Próximas ações**",
    "- Renovar criativos das campanhas de melhor performance",
    "- Pausar conjuntos com CPL acima da média",
    "- Aumentar 20% o orçamento dos top-2 conjuntos",
    "",
    `_Prompt recebido (${prompt.length} caracteres). Configure a chave da Anthropic para análise real._`,
  ].join("\n");
}
