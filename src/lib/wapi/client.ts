import type { WapiConfig, WapiGroup, WapiSendTextResponse } from "./types";

const BASE_URL = "https://api.w-api.app";

export class WapiClient {
  constructor(private readonly config: WapiConfig) {}

  private get headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      "Content-Type": "application/json",
    };
  }

  private buildUrl(path: string, params: Record<string, string> = {}) {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set("instanceId", this.config.instance_id);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return url.toString();
  }

  async listGroups(): Promise<WapiGroup[]> {
    const response = await fetch(this.buildUrl("/v1/group/get-all-groups"), {
      headers: this.headers,
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`W-API listGroups ${response.status}: ${await response.text()}`);
    }
    const data = await response.json();
    // W-API pode devolver { groups: [...] } ou direto [...] dependendo da versão
    if (Array.isArray(data)) return data as WapiGroup[];
    if (Array.isArray(data?.groups)) return data.groups as WapiGroup[];
    if (Array.isArray(data?.data)) return data.data as WapiGroup[];
    return [];
  }

  async getGroupMetadata(groupId: string): Promise<WapiGroup | null> {
    const response = await fetch(
      this.buildUrl("/v1/group/group-metadata", { groupId }),
      { headers: this.headers, cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error(`W-API getGroupMetadata ${response.status}: ${await response.text()}`);
    }
    return (await response.json()) as WapiGroup;
  }

  /**
   * Envia texto. Para grupo, `to` deve ser o ID com sufixo @g.us.
   * Para contato individual, basta o número (E.164 sem +).
   */
  async sendText(to: string, message: string, delayMs = 0): Promise<WapiSendTextResponse> {
    const response = await fetch(this.buildUrl("/v1/message/send-text"), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        phone: to,
        message,
        delayMessage: delayMs,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`W-API sendText ${response.status}: ${await response.text()}`);
    }
    return (await response.json()) as WapiSendTextResponse;
  }
}

export function isWapiConfigured(config?: WapiConfig | null): boolean {
  if (!config) return false;
  if (config.is_active === false) return false;
  return Boolean(config.instance_id && config.token);
}

export function createWapiClient(config: WapiConfig): WapiClient {
  return new WapiClient(config);
}

/**
 * Normaliza um identificador de grupo retornado pela API.
 * W-API às vezes devolve só a parte numérica; precisamos sempre do sufixo @g.us
 * pra mandar mensagem.
 */
export function normalizeGroupId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@g.us`;
}

/**
 * Conveniência: a W-API às vezes devolve `subject` e outras vezes `name`.
 */
export function getGroupName(g: WapiGroup): string {
  return g.subject ?? g.name ?? "(sem nome)";
}
