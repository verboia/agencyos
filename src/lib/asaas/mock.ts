import type { AsaasPayment, AsaasPixQrCode } from "./types";

export function mockPayment(overrides: Partial<AsaasPayment> = {}): AsaasPayment {
  return {
    id: `pay_mock_${Math.random().toString(36).slice(2, 10)}`,
    customer: "cus_mock",
    value: 1500,
    billingType: "PIX",
    status: "PENDING",
    dueDate: new Date().toISOString().slice(0, 10),
    invoiceUrl: "https://asaas.com/mock/invoice",
    ...overrides,
  };
}

export function mockPixQrCode(): AsaasPixQrCode {
  return {
    encodedImage:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    payload: "00020126330014BR.GOV.BCB.PIX0111mock@adria.combr5204000053039865802BR5913Adria Mock6304ABCD",
  };
}
