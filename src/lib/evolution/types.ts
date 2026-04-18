export interface EvolutionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

export interface EvolutionGroup {
  id: string;
  subject: string;
  owner?: string;
}

export interface EvolutionMessage {
  key: { id: string; remoteJid: string };
  status?: string;
}
