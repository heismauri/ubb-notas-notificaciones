const sendNotification = async (title: string, message: string, env: Env, firstTry = true): Promise<void> => {
  try {
    const response = await fetch(env.NTFY_URL, {
      method: "POST",
      headers: {
        Title: title,
        Authorization: `Basic ${env.NTFY_BASIC_AUTH}`
      },
      body: message.replace(/\*\*/g, "")
    });
    if (!response.ok) {
      throw new Error(`Error enviando notificación a ntfy: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    if (firstTry) {
      return sendNotification(title, message, env, false);
    }
    console.error("Error enviando notificación a ntfy:", (error as Error).message);
  }
};

export { sendNotification };
