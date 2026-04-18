import type {
  MetaSendResponse,
  MetaSendTemplateInput,
  MetaTemplateComponent,
  MetaWhatsappConfig,
} from "./types";

const GRAPH_VERSION = "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class MetaWhatsappClient {
  constructor(private readonly config: MetaWhatsappConfig) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${GRAPH_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.config.access_token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Meta WhatsApp ${path} ${response.status}: ${text}`);
    }
    return (await response.json()) as T;
  }

  async sendTemplate(input: MetaSendTemplateInput): Promise<MetaSendResponse> {
    const { to, templateName, languageCode = "pt_BR", bodyParams = [] } = input;
    const components: MetaTemplateComponent[] = [];

    if (bodyParams.length > 0) {
      components.push({
        type: "body",
        parameters: bodyParams.map((text) => ({ type: "text", text })),
      });
    }

    const payload = {
      messaging_product: "whatsapp",
      to: normalizePhone(to),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };

    return this.request<MetaSendResponse>(`/${this.config.phone_number_id}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async sendText(to: string, body: string): Promise<MetaSendResponse> {
    const payload = {
      messaging_product: "whatsapp",
      to: normalizePhone(to),
      type: "text",
      text: { preview_url: true, body },
    };
    return this.request<MetaSendResponse>(`/${this.config.phone_number_id}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export function isMetaWhatsappConfigured(config?: MetaWhatsappConfig | null): boolean {
  if (!config) return false;
  if (config.is_active === false) return false;
  return Boolean(config.access_token && config.phone_number_id);
}

export function createMetaWhatsappClient(config: MetaWhatsappConfig): MetaWhatsappClient {
  return new MetaWhatsappClient(config);
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}
