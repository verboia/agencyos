import type { Contract } from "@/types/database";

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateLongPt(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function partyType(contract: Pick<Contract, "document_type">): string {
  return contract.document_type === "cnpj"
    ? "pessoa jurídica de direito privado"
    : "pessoa física";
}

export function documentLabel(contract: Pick<Contract, "document_type">): string {
  return contract.document_type === "cnpj" ? "CNPJ/MF" : "CPF/MF";
}

export function representationForm(contract: Pick<Contract, "document_type">): string {
  return contract.document_type === "cnpj" ? "seu Contrato Social" : "por si";
}

export function formatFullAddress(
  contract: Pick<
    Contract,
    | "address_street"
    | "address_number"
    | "address_complement"
    | "address_neighborhood"
    | "address_city"
    | "address_state"
    | "address_zip"
  >
): string {
  const parts: string[] = [];
  if (contract.address_street) {
    const streetAndNumber = [contract.address_street, contract.address_number]
      .filter(Boolean)
      .join(", nº ");
    parts.push(streetAndNumber);
  }
  if (contract.address_complement) parts.push(contract.address_complement);
  if (contract.address_neighborhood) parts.push(`Bairro ${contract.address_neighborhood}`);
  if (contract.address_zip) parts.push(`CEP ${contract.address_zip}`);
  const cityState = [contract.address_city, contract.address_state].filter(Boolean).join(" – ");
  if (cityState) parts.push(cityState);
  return parts.join(", ") || "—";
}

const UNIDADES = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function grupoExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;
  const parts: string[] = [];
  if (c > 0) parts.push(CENTENAS[c]);
  if (d === 1) {
    parts.push(UNIDADES[10 + u]);
    return parts.join(" e ");
  }
  const tensAndUnits: string[] = [];
  if (d > 1) tensAndUnits.push(DEZENAS[d]);
  if (u > 0) tensAndUnits.push(UNIDADES[u]);
  if (tensAndUnits.length) parts.push(tensAndUnits.join(" e "));
  return parts.join(" e ");
}

function inteiroExtenso(n: number): string {
  if (n === 0) return "zero";
  if (n < 0) return `menos ${inteiroExtenso(-n)}`;

  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];

  if (milhoes > 0) {
    partes.push(milhoes === 1 ? "um milhão" : `${grupoExtenso(milhoes)} milhões`);
  }
  if (milhares > 0) {
    partes.push(milhares === 1 ? "mil" : `${grupoExtenso(milhares)} mil`);
  }
  if (resto > 0) partes.push(grupoExtenso(resto));

  return partes.join(" e ");
}

export function valorPorExtenso(value: number): string {
  if (!Number.isFinite(value)) return "";
  const cents = Math.round(value * 100);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;

  const reaisExt = reais > 0 ? `${inteiroExtenso(reais)} ${reais === 1 ? "real" : "reais"}` : "";
  const centavosExt =
    centavos > 0 ? `${inteiroExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}` : "";

  if (reaisExt && centavosExt) return `${reaisExt} e ${centavosExt}`;
  return reaisExt || centavosExt || "zero real";
}
