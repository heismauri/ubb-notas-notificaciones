import { DiscordWebhookPayload } from "@/types/DiscordWebhookPayload";

const genPayload = (title: string, messages: string[], color: number): DiscordWebhookPayload => {
  return {
    content: null,
    embeds: [
      {
        title,
        description: messages.join("\n"),
        color
      }
    ]
  };
};

export { genPayload };
