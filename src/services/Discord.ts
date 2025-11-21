import type { DiscordWebhookPayload } from "@/types/DiscordWebhookPayload";

export const SUCCESS_COLOR = 84120;
export const ERROR_COLOR = 16711680;

const sendNotification = async (
  payload: DiscordWebhookPayload,
  env: Env
): Promise<{ success: boolean; retryAfter?: number; status?: number; body?: string; error?: string }> => {
  try {
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      return { success: true };
    }
    const body = await response.text();
    if (response.status === 429) {
      try {
        const data: { retry_after?: number } = JSON.parse(body);
        const retryAfter = Math.ceil(data.retry_after || 1);
        return { success: false, retryAfter };
      } catch {
        const headerValue = response.headers.get("x-ratelimit-reset-after");
        const retryAfter = Math.ceil(Number(headerValue) || 1);
        return { success: false, retryAfter };
      }
    }
    return { success: false, status: response.status, body };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

export { sendNotification };
