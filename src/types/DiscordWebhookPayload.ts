export interface DiscordWebhookPayload {
  content: string | null;
  username?: string;
  avatar_url?: string;
  embeds?: {
    title: string;
    description: string;
    url?: string;
    color?: number;
    footer?: {
      text: string;
      icon_url?: string;
    };
    image?: {
      url: string;
    };
    thumbnail?: {
      url: string;
    };
    author?: {
      name: string;
      url?: string;
      icon_url?: string;
    };
    fields?: {
      name: string;
      value: string;
      inline?: boolean;
    }[];
  }[];
}
