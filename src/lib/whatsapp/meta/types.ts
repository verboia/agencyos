export interface MetaWhatsappConfig {
  phone_number_id: string;
  business_account_id: string;
  access_token: string;
  app_secret?: string | null;
  webhook_verify_token: string;
  is_active?: boolean | null;
}

export interface MetaTemplateParam {
  type: "text";
  text: string;
}

export interface MetaTemplateComponent {
  type: "body" | "header" | "button";
  parameters?: MetaTemplateParam[];
  sub_type?: "url" | "quick_reply";
  index?: string;
}

export interface MetaSendTemplateInput {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
}

export interface MetaSendResponse {
  messaging_product: "whatsapp";
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
}

export interface MetaWebhookValue {
  messaging_product: "whatsapp";
  metadata: { display_phone_number: string; phone_number_id: string };
  messages?: Array<{
    id: string;
    from: string;
    timestamp: string;
    type: string;
    text?: { body: string };
  }>;
  statuses?: Array<{
    id: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: string;
    recipient_id: string;
  }>;
}

export interface MetaWebhookEvent {
  object: "whatsapp_business_account";
  entry: Array<{
    id: string;
    changes: Array<{
      field: "messages";
      value: MetaWebhookValue;
    }>;
  }>;
}
