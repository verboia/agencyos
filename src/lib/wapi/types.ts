export interface WapiConfig {
  instance_id: string;
  token: string;
  is_active?: boolean | null;
}

export interface WapiGroupParticipant {
  id?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

export interface WapiGroup {
  id: string;            // ex: "120363xxxxxxxxxxxx@g.us"
  subject?: string;      // nome do grupo
  name?: string;         // algumas respostas usam "name"
  participants?: WapiGroupParticipant[];
  participantsCount?: number;
  isAdmin?: boolean;
  creation?: number;
  description?: string;
  pictureUrl?: string;
  [k: string]: unknown;
}

export interface WapiSendTextResponse {
  messageId?: string;
  id?: string;
  status?: string;
  [k: string]: unknown;
}
