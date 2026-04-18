import type {
  AsaasCustomer,
  AsaasPayment,
  AsaasPixQrCode,
  AsaasSubscription,
  CreateCustomerInput,
  CreatePaymentInput,
  CreateSubscriptionInput,
} from "./types";

export interface AsaasClientConfig {
  apiKey: string;
  environment: "sandbox" | "production";
}

const ENV_URL = {
  sandbox: "https://sandbox.asaas.com/api/v3",
  production: "https://api.asaas.com/v3",
};

export class AsaasClient {
  constructor(private readonly config: AsaasClientConfig) {}

  private get baseUrl() {
    return ENV_URL[this.config.environment];
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        access_token: this.config.apiKey,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Asaas ${path} ${response.status}: ${text}`);
    }
    return (await response.json()) as T;
  }

  createCustomer(input: CreateCustomerInput): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>("/customers", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  createSubscription(input: CreateSubscriptionInput): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>("/subscriptions", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  createPayment(input: CreatePaymentInput): Promise<AsaasPayment> {
    return this.request<AsaasPayment>("/payments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getPayment(id: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>(`/payments/${id}`);
  }

  getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
    return this.request<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
  }

  cancelSubscription(id: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>(`/subscriptions/${id}`, { method: "DELETE" });
  }

  updateSubscription(id: string, patch: Partial<CreateSubscriptionInput>): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>(`/subscriptions/${id}`, {
      method: "POST",
      body: JSON.stringify(patch),
    });
  }
}

export interface BillingConfigRow {
  asaas_api_key?: string | null;
  asaas_environment?: "sandbox" | "production" | null;
  is_active?: boolean | null;
}

export function isAsaasConfigured(config?: BillingConfigRow | null): boolean {
  if (!config) return false;
  if (!config.is_active) return false;
  return Boolean(config.asaas_api_key && config.asaas_api_key.length > 10);
}

export function createAsaasClient(config: BillingConfigRow): AsaasClient {
  if (!config.asaas_api_key) throw new Error("Asaas API key ausente");
  return new AsaasClient({
    apiKey: config.asaas_api_key,
    environment: config.asaas_environment ?? "sandbox",
  });
}
