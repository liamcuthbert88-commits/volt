export type ConversationRole = "user" | "volt";

export interface ConversationMessage {
  readonly id: string;
  readonly role: ConversationRole;
  readonly text: string;
}

export type ConversationTone = "overwhelmed" | "tired" | "focus" | "default";
