export const BRAND = {
  name: "AgencyOS",
  agency: "Adria",
  agencyFull: "Adria Tecnologia e Marketing Digital",
  primaryColor: "#4A90D9",
  darkColor: "#1a1a2e",
};

export const CLIENT_STATUS = {
  onboarding: { label: "Onboarding", color: "bg-blue-500" },
  active: { label: "Ativo", color: "bg-green-500" },
  paused: { label: "Pausado", color: "bg-yellow-500" },
  churned: { label: "Cancelado", color: "bg-red-500" },
} as const;

export const TASK_STATUS = {
  pending: { label: "Pendente", color: "bg-slate-500" },
  in_progress: { label: "Em andamento", color: "bg-blue-500" },
  blocked: { label: "Bloqueada", color: "bg-yellow-500" },
  done: { label: "Concluída", color: "bg-green-500" },
  cancelled: { label: "Cancelada", color: "bg-red-500" },
} as const;

export const TASK_PRIORITY = {
  low: { label: "Baixa", color: "bg-slate-400" },
  medium: { label: "Média", color: "bg-blue-400" },
  high: { label: "Alta", color: "bg-orange-500" },
  urgent: { label: "Urgente", color: "bg-red-500" },
} as const;

export const TASK_CATEGORY = {
  onboarding: { label: "Onboarding" },
  recurring_weekly: { label: "Semanal" },
  recurring_monthly: { label: "Mensal" },
  one_time: { label: "Avulsa" },
} as const;

export const CONTRACT_STATUS = {
  draft: { label: "Rascunho", color: "bg-slate-500" },
  pending_review: { label: "Revisão", color: "bg-yellow-500" },
  sent: { label: "Enviado", color: "bg-blue-500" },
  viewed: { label: "Visualizado", color: "bg-purple-500" },
  signed: { label: "Assinado", color: "bg-green-500" },
  expired: { label: "Expirado", color: "bg-red-400" },
  cancelled: { label: "Cancelado", color: "bg-red-500" },
} as const;

export const PROPOSAL_STATUS = {
  draft: { label: "Rascunho", color: "bg-slate-500" },
  sent: { label: "Enviada", color: "bg-blue-500" },
  viewed: { label: "Visualizada", color: "bg-purple-500" },
  accepted: { label: "Aceita", color: "bg-green-500" },
  rejected: { label: "Recusada", color: "bg-red-500" },
  expired: { label: "Expirada", color: "bg-slate-400" },
  converted: { label: "Convertida", color: "bg-emerald-600" },
} as const;

export const INVOICE_STATUS = {
  pending: { label: "Pendente", color: "bg-yellow-500" },
  confirmed: { label: "Confirmada", color: "bg-blue-500" },
  received: { label: "Paga", color: "bg-green-500" },
  overdue: { label: "Vencida", color: "bg-red-500" },
  refunded: { label: "Estornada", color: "bg-purple-500" },
  cancelled: { label: "Cancelada", color: "bg-slate-500" },
} as const;

export const HEALTH_STATUS = {
  healthy: { label: "Saudável", color: "bg-green-500", emoji: "🟢" },
  attention: { label: "Atenção", color: "bg-yellow-500", emoji: "🟡" },
  critical: { label: "Crítico", color: "bg-red-500", emoji: "🔴" },
} as const;

export const ASSET_CATEGORIES = {
  logo: { label: "Logo", emoji: "🎨" },
  brand_guide: { label: "Manual de Marca", emoji: "📘" },
  photo: { label: "Fotos", emoji: "📸" },
  video: { label: "Vídeos", emoji: "🎬" },
  creative: { label: "Criativos", emoji: "✨" },
  copy: { label: "Textos", emoji: "📝" },
  document: { label: "Documentos", emoji: "📄" },
  other: { label: "Outros", emoji: "📦" },
} as const;

export const PAYMENT_METHODS = {
  PIX: "PIX",
  BOLETO: "Boleto",
  CREDIT_CARD: "Cartão de Crédito",
  UNDEFINED: "A definir",
} as const;

export const DEFAULT_MONTHLY_FEE = 1500;
export const DEFAULT_CONTRACT_MONTHS = 12;
export const DEFAULT_PAYMENT_DUE_DAY = 10;
export const DEFAULT_LATE_FEE = 2.0;
export const DEFAULT_LATE_INTEREST = 1.0;
export const DEFAULT_CANCELLATION_FEE = 20.0;
export const DEFAULT_NOTICE_DAYS = 30;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const SEGMENTS = [
  "Cafeteria",
  "Restaurante",
  "Oficina Mecânica",
  "Clínica",
  "Loja Varejo",
  "Salão de Beleza",
  "Academia",
  "Estética",
  "E-commerce",
  "Prestador de Serviços",
  "Outro",
] as const;
