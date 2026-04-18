import type { EvolutionConfig, EvolutionGroup, EvolutionMessage } from "./types";

export class EvolutionClient {
  constructor(private readonly config: EvolutionConfig) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.config.apiUrl}${path}`, {
      ...init,
      headers: {
        apikey: this.config.apiKey,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Evolution ${path} ${response.status}: ${text}`);
    }
    return (await response.json()) as T;
  }

  createGroup(subject: string, participants: string[]): Promise<EvolutionGroup> {
    return this.request<EvolutionGroup>(`/group/create/${this.config.instanceName}`, {
      method: "POST",
      body: JSON.stringify({ subject, participants }),
    });
  }

  sendText(to: string, text: string): Promise<EvolutionMessage> {
    return this.request<EvolutionMessage>(`/message/sendText/${this.config.instanceName}`, {
      method: "POST",
      body: JSON.stringify({ number: to, text }),
    });
  }

  sendImage(to: string, image: string, caption?: string): Promise<EvolutionMessage> {
    return this.request<EvolutionMessage>(`/message/sendMedia/${this.config.instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        number: to,
        mediatype: "image",
        media: image,
        caption: caption ?? "",
      }),
    });
  }
}

export interface EvolutionConfigRow {
  api_url: string;
  api_key: string;
  instance_name: string;
  is_active: boolean;
}

export function isEvolutionConfigured(config?: EvolutionConfigRow | null): boolean {
  if (!config) return false;
  if (!config.is_active) return false;
  return Boolean(config.api_url && config.api_key && config.instance_name);
}

export function createEvolutionClient(config: EvolutionConfigRow): EvolutionClient {
  return new EvolutionClient({
    apiUrl: config.api_url.replace(/\/$/, ""),
    apiKey: config.api_key,
    instanceName: config.instance_name,
  });
}
